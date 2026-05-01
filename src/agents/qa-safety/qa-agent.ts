import type { Agent, AgentResult, AgentTask } from "../core/types";
import { ZERO_COST } from "../core/types";
import { runForbiddenTermsCheck } from "./skills/forbidden-terms-check";
import { runLanguageCheck } from "./skills/swedish-language-check";

/**
 * The QA/Safety agent is special:
 *   - The router does NOT select it. It wraps every other agent's execution via the safety gate.
 *   - It is registered so direct calls (e.g. "audit this draft") still work.
 */
export const qaSafetyAgent: Agent = {
  id: "qa-safety",
  description:
    "Owns brand-safety, language, leakage and approval-gate checks. Wraps every other agent's execution.",

  canHandle(task: AgentTask): number {
    return /\b(safety|forbidden|leak|leakage|approval[- ]gate|compliance|brand[- ]check)\b/i.test(
      task.intent
    )
      ? 0.8
      : 0;
  },

  async execute(task: AgentTask): Promise<AgentResult> {
    const text = String(task.payload?.text ?? "");
    const slug = task.context.productSlug;
    const leak = slug ? runForbiddenTermsCheck(text, slug) : [];
    const lang = runLanguageCheck(text);

    return {
      agentId: "qa-safety",
      output: { leak, language: lang },
      confidence: 1,
      usedMemory: [],
      warnings: [
        ...(leak.length ? [`Forbidden terms: ${leak.join(", ")}`] : []),
        ...(!lang.isSwedish ? [`Language check: ${lang.reason}`] : [])
      ],
      cost: ZERO_COST
    };
  }
};
