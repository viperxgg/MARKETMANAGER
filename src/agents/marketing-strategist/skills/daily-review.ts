import { runAgencyBrain } from "@/lib/agency-brain";
import { openAiTextConfigurationError } from "@/lib/openai-config";
import type { ProductSlug } from "@/lib/product-data";
import type { AgentCost, AgentTask, MemoryReference } from "../../core/types";
import { ZERO_COST } from "../../core/types";

export interface DailyReviewOutput {
  scope: "global" | ProductSlug;
  reportId?: string;
  summary: string;
  recommendations: string[];
  usedMemory: MemoryReference[];
  warnings: string[];
  suggestsContent: boolean;
  cost: AgentCost;
}

export async function runDailyReview(task: AgentTask): Promise<DailyReviewOutput> {
  const scope = (task.payload?.scope as "global" | ProductSlug | undefined) ?? "global";
  const refs = (task.payload?._memoryRefs as MemoryReference[] | undefined) ?? [];

  try {
    const result = await runAgencyBrain({ scope, objective: "daily_review" });
    const recs = (result.output.recommendations ?? []).map(
      (r) => `${r.title}: ${r.nextStep}`
    );
    return {
      scope,
      reportId: result.reportId,
      summary: result.output.summary ?? "",
      recommendations: recs,
      usedMemory: refs,
      warnings: result.output.warnings ?? [],
      suggestsContent: recs.some((r) => /post|caption|copy|draft|publish/i.test(r)),
      cost: ZERO_COST
    };
  } catch (err) {
    // Preserve the OpenAI-config error code so the action layer can route to its specific notice.
    if (err instanceof Error && err.message === openAiTextConfigurationError) {
      throw err;
    }
    const msg = err instanceof Error ? err.message : "daily-review failed";
    return {
      scope,
      summary: "Daily review unavailable.",
      recommendations: [],
      usedMemory: refs,
      warnings: [msg],
      suggestsContent: false,
      cost: ZERO_COST
    };
  }
}
