import { runAgencyBrain } from "@/lib/agency-brain";
import { openAiTextConfigurationError } from "@/lib/openai-config";
import type { ProductSlug } from "@/lib/product-data";
import type { AgentCost, AgentTask, MemoryReference } from "../../core/types";
import { ZERO_COST } from "../../core/types";

export interface CampaignBriefOutput {
  scope: "global" | ProductSlug;
  reportId?: string;
  summary: string;
  recommendations: string[];
  usedMemory: MemoryReference[];
  warnings: string[];
  cost: AgentCost;
}

export async function runCampaignBrief(task: AgentTask): Promise<CampaignBriefOutput> {
  const scope = (task.payload?.scope as "global" | ProductSlug | undefined) ?? "global";
  const refs = (task.payload?._memoryRefs as MemoryReference[] | undefined) ?? [];

  try {
    const result = await runAgencyBrain({ scope, objective: "campaign_idea" });
    const recs = (result.output.recommendations ?? []).map(
      (r) => `${r.title} (${r.channel}): ${r.nextStep}`
    );
    return {
      scope,
      reportId: result.reportId,
      summary: result.output.summary ?? "",
      recommendations: recs,
      usedMemory: refs,
      warnings: result.output.warnings ?? [],
      cost: ZERO_COST
    };
  } catch (err) {
    if (err instanceof Error && err.message === openAiTextConfigurationError) {
      throw err;
    }
    const msg = err instanceof Error ? err.message : "campaign-brief failed";
    return {
      scope,
      summary: "Campaign brief unavailable.",
      recommendations: [],
      usedMemory: refs,
      warnings: [msg],
      cost: ZERO_COST
    };
  }
}
