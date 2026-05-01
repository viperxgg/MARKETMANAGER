import { assertResultShape } from "./contract";
import { getAgent, listAgents } from "./registry";
import { route, type RouteDecision } from "./router";
import { qaPost, qaPre } from "./safety-gate";
import type { AgentResult, AgentTask } from "./types";

export interface OrchestrationResult {
  decision: RouteDecision;
  results: AgentResult[];
}

/**
 * The single execution path:
 *   1. Route the task to one or more agents (deterministic + self-vote)
 *   2. Run qaPre to inject memory snippets into the task payload
 *   3. Execute the agent(s) — single, sequential (chained) or parallel (fan-out)
 *   4. Run qaPost on every result to scan for forbidden terms / language failures
 *      and persist any opt-in ApprovalItem rows
 */
export async function orchestrate(task: AgentTask): Promise<OrchestrationResult> {
  if (listAgents().length === 0) {
    throw new Error("No agents registered. Did you forget to call bootstrapAgents()?");
  }

  const decision = await route(task);
  const enriched = await qaPre(task);

  if (decision.candidates.length === 1) {
    const agent = getAgent(decision.primary);
    if (!agent) throw new Error(`Agent not found: ${decision.primary}`);
    const raw = await agent.execute(enriched);
    assertResultShape(raw);
    const safe = await qaPost(raw, enriched);
    const chained = await chain(safe, enriched);
    return { decision, results: [safe, ...chained] };
  }

  // Parallel fan-out across the candidate set.
  const parallel = await Promise.all(
    decision.candidates.map(async (id) => {
      const agent = getAgent(id);
      if (!agent) return null;
      const raw = await agent.execute(enriched);
      assertResultShape(raw);
      return qaPost(raw, enriched);
    })
  );
  const results = parallel.filter((r): r is AgentResult => r !== null);
  return { decision, results };
}

async function chain(result: AgentResult, task: AgentTask): Promise<AgentResult[]> {
  if (!result.proposedNextAgents?.length) return [];
  const out: AgentResult[] = [];
  for (const id of result.proposedNextAgents) {
    const agent = getAgent(id);
    if (!agent) continue;
    const next: AgentTask = {
      ...task,
      payload: {
        ...(task.payload ?? {}),
        _upstream: result.output,
        _upstreamAgent: result.agentId
      }
    };
    const raw = await agent.execute(next);
    assertResultShape(raw);
    out.push(await qaPost(raw, next));
  }
  return out;
}
