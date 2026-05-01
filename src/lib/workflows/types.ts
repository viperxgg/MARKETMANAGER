import type { ProductSlug } from "@/lib/product-data";

/**
 * Operator + environment context passed to every workflow step.
 * Mirrors AgentContext but is workflow-scoped.
 */
export interface WorkflowContext {
  productSlug?: ProductSlug;
  campaignId?: string;
  operator: { email: string };
  dbAvailable: boolean;
  dryRun: boolean;
}

/**
 * Status of a single step within a workflow run.
 *   pending   — not yet started
 *   running   — currently executing
 *   completed — finished without throwing
 *   failed    — threw; engine halts and persists
 *   skipped   — guard returned false; engine moves to next step
 */
export type StepStatus = "pending" | "running" | "completed" | "failed" | "skipped";

export type RunStatus = "running" | "completed" | "failed" | "partial";

export interface StepTrace {
  id: string;
  name: string;
  status: StepStatus;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  output?: unknown;
  error?: string;
  warnings: string[];
}

/**
 * One workflow step.
 *   - `guard` lets a step be conditionally skipped (e.g. only run scoring if leads were created).
 *   - `run` receives the accumulated state and returns the new state (immutable update).
 *   - `producesApproval` is a hint that this step writes ApprovalItem rows; surfaced in traces.
 */
export interface WorkflowStep<S> {
  id: string;
  name: string;
  guard?: (state: S, ctx: WorkflowContext) => boolean;
  run: (state: S, ctx: WorkflowContext) => Promise<{
    state: S;
    output?: unknown;
    warnings?: string[];
  }>;
  producesApproval?: boolean;
}

export interface Workflow<S, I = Record<string, unknown>> {
  id: string;
  name: string;
  description: string;
  /** Build initial state from the trigger input. */
  initial: (input: I, ctx: WorkflowContext) => S;
  steps: WorkflowStep<S>[];
}

export interface WorkflowRunResult<S> {
  runId: string;
  workflowId: string;
  status: RunStatus;
  state: S;
  steps: StepTrace[];
  startedAt: string;
  completedAt: string;
  durationMs: number;
  warnings: string[];
}
