import { prisma } from "@/lib/db";
import type { RunStatus, StepTrace, WorkflowContext } from "./types";

/**
 * Persistence wrapper for WorkflowRun.
 *
 * Every method degrades gracefully — if DB is unavailable or the WorkflowRun model
 * isn't migrated yet, we return null IDs and the engine continues in-memory.
 * This matches the existing "preview mode" pattern used elsewhere in the codebase.
 */

export interface CreatedRun {
  id: string | null;
  startedAt: string;
}

interface PrismaWithWorkflowRun {
  workflowRun?: {
    create: (args: { data: Record<string, unknown> }) => Promise<{ id: string }>;
    update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<unknown>;
  };
}

function model() {
  const p = prisma as unknown as PrismaWithWorkflowRun;
  return p.workflowRun;
}

export async function createRun(
  workflowId: string,
  ctx: WorkflowContext,
  initialState: unknown
): Promise<CreatedRun> {
  const startedAt = new Date().toISOString();
  if (!ctx.dbAvailable) return { id: null, startedAt };
  const m = model();
  if (!m) return { id: null, startedAt };

  try {
    const row = await m.create({
      data: {
        workflowId,
        status: "running",
        triggeredBy: ctx.operator.email || "system",
        productSlug: ctx.productSlug ?? null,
        context: initialState as object,
        steps: []
      }
    });
    return { id: row.id, startedAt };
  } catch {
    return { id: null, startedAt };
  }
}

export async function updateRunSteps(runId: string | null, steps: StepTrace[]): Promise<void> {
  if (!runId) return;
  const m = model();
  if (!m) return;
  try {
    await m.update({
      where: { id: runId },
      data: { steps: steps as unknown as object }
    });
  } catch {
    /* swallow — persistence failures must not break the workflow */
  }
}

export async function finalizeRun(
  runId: string | null,
  status: RunStatus,
  steps: StepTrace[],
  finalState: unknown
): Promise<void> {
  if (!runId) return;
  const m = model();
  if (!m) return;
  try {
    await m.update({
      where: { id: runId },
      data: {
        status,
        completedAt: new Date(),
        steps: steps as unknown as object,
        finalState: finalState as object
      }
    });
  } catch {
    /* swallow */
  }
}
