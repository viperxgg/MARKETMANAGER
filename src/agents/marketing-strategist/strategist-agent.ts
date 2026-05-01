import type { Agent, AgentResult, AgentTask } from "../core/types";
import { ZERO_COST } from "../core/types";
import { runCampaignBrief } from "./skills/campaign-brief";
import { runDailyReview } from "./skills/daily-review";

export const marketingStrategistAgent: Agent = {
  id: "marketing-strategist",
  description:
    "Owns campaign strategy, messaging angles, daily strategic recommendations and messaging review.",

  canHandle(task: AgentTask): number {
    const t = `${task.intent} ${task.objective ?? ""}`.toLowerCase();
    let score = 0;
    if (/\bcampaign|strategy|angle|segment|messaging|daily|positioning\b/.test(t)) {
      score += 0.7;
    }
    if (
      task.objective === "campaign_idea" ||
      task.objective === "daily_review" ||
      task.objective === "messaging_review"
    ) {
      score += 0.3;
    }
    return Math.min(score, 1);
  },

  async execute(task: AgentTask): Promise<AgentResult> {
    const objective = (task.objective ?? "").toLowerCase();

    if (objective === "daily_review" || /\bdaily\b/.test(task.intent)) {
      const out = await runDailyReview(task);
      return {
        agentId: "marketing-strategist",
        output: out,
        confidence: 0.85,
        usedMemory: out.usedMemory,
        warnings: out.warnings,
        proposedNextAgents: out.suggestsContent ? ["content"] : [],
        cost: out.cost ?? ZERO_COST
      };
    }

    const brief = await runCampaignBrief(task);
    return {
      agentId: "marketing-strategist",
      output: brief,
      confidence: 0.9,
      usedMemory: brief.usedMemory,
      warnings: brief.warnings,
      // Strategist hands the brief downstream when content/lead-gen agents exist; today they no-op silently.
      proposedNextAgents: ["content", "lead-gen"],
      cost: brief.cost ?? ZERO_COST
    };
  }
};
