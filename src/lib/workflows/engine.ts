import { getWorkflow } from "./registry";
import { createRun, finalizeRun, updateRunSteps } from "./persistence";
import type {
  RunStatus,
  StepTrace,
  WorkflowContext,
  WorkflowRunResult
} from "./types";

/**
 * Executes a registered workflow end-to-end.
 *
 * Behaviour:
 *   - Steps run sequentially. State flows forward; each step receives the latest state.
 *   - A step's `guard` (if defined) returning false marks it `skipped` and continues.
 *   - A throwing step marks itself `failed`, halts the run, and the run status becomes
 *     "failed" if no steps had completed, or "partial" if at least one had.
 *   - Every transition is persisted to WorkflowRun.steps so the UI can show progress.
 *   - The engine NEVER throws — failures are surfaced via `result.status` and `result.warnings`.
 */
export async function runWorkflow<S, I = Record<string, unknown>>(
  workflowId: string,
  input: I,
  ctx: WorkflowContext
): Promise<WorkflowRunResult<S>> {
  const workflow = getWorkflow(workflowId);
  if (!workflow) {
    const now = new Date().toISOString();
    return {
      runId: "",
      workflowId,
      status: "failed",
      state: input as unknown as S,
      steps: [],
      startedAt: now,
      completedAt: now,
      durationMs: 0,
      warnings: [`Workflow not registered: ${workflowId}`]
    };
  }

  const startedAtIso = new Date().toISOString();
  const startedAtMs = Date.now();

  let state = workflow.initial(input, ctx) as S;
  const created = await createRun(workflow.id, ctx, state);
  const runId = created.id ?? "";

  const traces: StepTrace[] = workflow.steps.map((s) => ({
    id: s.id,
    name: s.name,
    status: "pending",
    warnings: []
  }));

  const warnings: string[] = [];
  let firstCompletedIndex = -1;
  let failedIndex = -1;

  for (let i = 0; i < workflow.steps.length; i++) {
    const step = workflow.steps[i];
    const trace = traces[i];

    // Guard
    if (step.guard && !step.guard(state, ctx)) {
      trace.status = "skipped";
      trace.startedAt = new Date().toISOString();
      trace.completedAt = trace.startedAt;
      trace.durationMs = 0;
      await updateRunSteps(runId, traces);
      continue;
    }

    trace.status = "running";
    trace.startedAt = new Date().toISOString();
    const stepStartedMs = Date.now();
    await updateRunSteps(runId, traces);

    try {
      const result = await step.run(state, ctx);
      state = result.state;
      trace.output = result.output;
      trace.warnings = result.warnings ?? [];
      if (result.warnings?.length) warnings.push(...result.warnings);
      trace.status = "completed";
      trace.completedAt = new Date().toISOString();
      trace.durationMs = Date.now() - stepStartedMs;
      if (firstCompletedIndex === -1) firstCompletedIndex = i;
      await updateRunSteps(runId, traces);
    } catch (err) {
      const message = err instanceof Error ? err.message.slice(0, 500) : "step failed";
      trace.status = "failed";
      trace.error = message;
      trace.completedAt = new Date().toISOString();
      trace.durationMs = Date.now() - stepStartedMs;
      warnings.push(`[${step.id}] ${message}`);
      failedIndex = i;
      await updateRunSteps(runId, traces);
      break;
    }
  }

  const status: RunStatus =
    failedIndex === -1
      ? "completed"
      : firstCompletedIndex === -1
        ? "failed"
        : "partial";

  const completedAtIso = new Date().toISOString();
  await finalizeRun(runId, status, traces, state);

  return {
    runId,
    workflowId: workflow.id,
    status,
    state,
    steps: traces,
    startedAt: startedAtIso,
    completedAt: completedAtIso,
    durationMs: Date.now() - startedAtMs,
    warnings
  };
}
