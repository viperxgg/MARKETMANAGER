import type { Workflow } from "./types";

const map = new Map<string, Workflow<any, any>>();

export function registerWorkflow<S, I>(workflow: Workflow<S, I>): void {
  map.set(workflow.id, workflow as Workflow<any, any>);
}

export function getWorkflow(id: string): Workflow<any, any> | undefined {
  return map.get(id);
}

export function listWorkflows(): Workflow<any, any>[] {
  return Array.from(map.values());
}
