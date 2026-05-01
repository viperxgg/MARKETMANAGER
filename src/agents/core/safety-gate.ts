import { prisma } from "@/lib/db";
import type { AgentResult, AgentTask } from "./types";
import { runForbiddenTermsCheck } from "../qa-safety/skills/forbidden-terms-check";
import { runLanguageCheck } from "../qa-safety/skills/swedish-language-check";
import { buildMemoryPrompt } from "../qa-safety/skills/memory-prompt-injection";

/**
 * Pre-execution: fetches AgencyMemory snippets and inlines them into the task payload.
 * Every agent can read `task.payload._memoryBlock` and append it to its system prompt.
 */
export async function qaPre(task: AgentTask): Promise<AgentTask> {
  const { block, snippets } = await buildMemoryPrompt(task.context.productSlug);
  return {
    ...task,
    payload: {
      ...(task.payload ?? {}),
      _memoryBlock: block,
      _memoryRefs: snippets.references
    }
  };
}

interface ApprovalPayload {
  productId?: string;
  itemType: string;
  itemId: string;
  preview: string;
  checklist: string[];
}

function extractApprovalPayload(persist: AgentResult["persist"]): ApprovalPayload | null {
  if (!persist || persist.persistAsApproval !== true) return null;
  return {
    productId: persist.productId,
    itemType: persist.itemType ?? "agent_output",
    itemId: persist.itemId ?? `ag_${Date.now()}`,
    preview: (persist.preview ?? "Agent-generated content awaiting owner review.").slice(0, 500),
    checklist: persist.checklist ?? []
  };
}

/**
 * Post-execution:
 *   1. Forbidden-term scan (always when productSlug is set)
 *   2. Swedish language check (when output declares expectsSwedish: true)
 *   3. ApprovalItem persistence (when output declares persistAsApproval: true)
 *
 * The gate never throws; failures become warnings on the result.
 */
export async function qaPost(result: AgentResult, task: AgentTask): Promise<AgentResult> {
  const text = JSON.stringify(result.output ?? "");
  const warnings = [...result.warnings];

  if (task.context.productSlug) {
    const leak = runForbiddenTermsCheck(text, task.context.productSlug);
    if (leak.length) warnings.push(`Forbidden terms detected: ${leak.join(", ")}`);
  }

  if (result.persist?.expectsSwedish) {
    const lang = runLanguageCheck(text);
    if (!lang.isSwedish) warnings.push(`Language check failed: ${lang.reason}`);
  }

  let approvalItemId: string | undefined;
  const approval = extractApprovalPayload(result.persist);
  if (approval && task.context.dbAvailable && approval.productId) {
    try {
      const item = await prisma.approvalItem.create({
        data: {
          productId: approval.productId,
          itemType: approval.itemType,
          itemId: approval.itemId,
          contentPreview: approval.preview,
          riskWarnings: warnings,
          complianceChecklist: approval.checklist,
          status: warnings.length > 0 ? "needs_revision" : "owner_review",
          approved_by_owner: false,
          manual_execution_required: true,
          finalStatus: "manual_execution_required"
        }
      });
      approvalItemId = item.id;
    } catch (err) {
      const msg = err instanceof Error ? err.message.slice(0, 120) : "unknown";
      warnings.push(`Approval persistence failed: ${msg}`);
    }
  }

  return { ...result, warnings, approvalItemId };
}
