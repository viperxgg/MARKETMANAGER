import { bootstrapWorkflows } from "./bootstrap";
import { runWorkflow as runWorkflowImpl } from "./engine";
import type { WorkflowContext, WorkflowRunResult } from "./types";

export type {
  RunStatus,
  StepStatus,
  StepTrace,
  Workflow,
  WorkflowContext,
  WorkflowRunResult,
  WorkflowStep
} from "./types";

/**
 * The ONLY function server actions should call to trigger a workflow.
 * Bootstraps the workflow registry on first call.
 *
 *   const result = await runWorkflow("lead-research-pipeline", { productSlug, csvText }, ctx);
 *
 * The engine never throws. Inspect `result.status` and `result.warnings`.
 */
export async function runWorkflow<S, I = Record<string, unknown>>(
  workflowId: string,
  input: I,
  ctx: WorkflowContext
): Promise<WorkflowRunResult<S>> {
  bootstrapWorkflows();
  return runWorkflowImpl<S, I>(workflowId, input, ctx);
}

export { listWorkflows } from "./registry";
