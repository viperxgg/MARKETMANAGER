import type { Agent, AgentId } from "./types";

const map = new Map<AgentId, Agent>();

export function registerAgent(agent: Agent): void {
  map.set(agent.id, agent);
}

export function getAgent(id: AgentId): Agent | undefined {
  return map.get(id);
}

export function listAgents(): Agent[] {
  return Array.from(map.values());
}

export function hasAgent(id: AgentId): boolean {
  return map.has(id);
}

export function clearRegistry(): void {
  // Test helper. Not used in runtime.
  map.clear();
}
