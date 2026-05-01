import { bootstrapAgents } from "./core/bootstrap";
import { assertTaskShape } from "./core/contract";
import { orchestrate, type OrchestrationResult } from "./core/orchestrator";
import type { AgentTask } from "./core/types";

export type {
  AgentContext,
  AgentCost,
  AgentId,
  AgentResult,
  AgentTask,
  MemoryReference
} from "./core/types";
export type { OrchestrationResult } from "./core/orchestrator";
export type { RouteDecision } from "./core/router";

/**
 * The ONLY entry point server actions should call.
 * Routing, safety gating, and memory injection are internal — never pass an agentId.
 *
 *   const { decision, results } = await runAgent({
 *     intent: "daily review for nord-smart-menu",
 *     objective: "daily_review",
 *     payload: { scope: "nord-smart-menu" },
 *     context: {
 *       productSlug: "nord-smart-menu",
 *       operator: { email: process.env.OWNER_EMAIL ?? "" },
 *       dbAvailable: Boolean(process.env.DATABASE_URL),
 *       dryRun: false
 *     }
 *   });
 */
export async function runAgent(task: AgentTask): Promise<OrchestrationResult> {
  bootstrapAgents();
  assertTaskShape(task);
  return orchestrate(task);
}
