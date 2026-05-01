import type { AgentResult, AgentTask } from "./types";

export class AgentContractError extends Error {
  constructor(rule: string, detail: string) {
    super(`Agent contract violation [${rule}]: ${detail}`);
    this.name = "AgentContractError";
  }
}

export function assertTaskShape(task: AgentTask): void {
  if (!task || typeof task.intent !== "string" || task.intent.trim().length === 0) {
    throw new AgentContractError("task.intent", "non-empty string required");
  }
  if (!task.context || typeof task.context !== "object") {
    throw new AgentContractError("task.context", "context object required");
  }
  if (typeof task.context.dbAvailable !== "boolean") {
    throw new AgentContractError("task.context.dbAvailable", "boolean required");
  }
}

export function assertResultShape(r: AgentResult): void {
  if (!r || typeof r !== "object") throw new AgentContractError("result", "object required");
  if (typeof r.agentId !== "string")
    throw new AgentContractError("result.agentId", "string required");
  if (typeof r.confidence !== "number")
    throw new AgentContractError("result.confidence", "number required");
  if (!Array.isArray(r.warnings))
    throw new AgentContractError("result.warnings", "array required");
  if (!Array.isArray(r.usedMemory))
    throw new AgentContractError("result.usedMemory", "array required");
  if (!r.cost || typeof r.cost.usd !== "number")
    throw new AgentContractError("result.cost", "AgentCost required");
}
