import { prisma } from "./db";
import type { StepTrace } from "./workflows/types";

export interface WorkflowRunSummary {
  id: string;
  workflowId: string;
  status: string;
  triggeredBy: string;
  productSlug: string | null;
  createdAt: Date;
  completedAt: Date | null;
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  skippedSteps: number;
}

export interface WorkflowRunDetail extends WorkflowRunSummary {
  context: unknown;
  finalState: unknown;
  steps: StepTrace[];
}

interface PrismaWithWorkflowRun {
  workflowRun?: {
    findMany: (args?: unknown) => Promise<unknown[]>;
    findUnique: (args: unknown) => Promise<unknown>;
  };
}

function model() {
  const p = prisma as unknown as PrismaWithWorkflowRun;
  return p.workflowRun;
}

interface RawRun {
  id: string;
  workflowId: string;
  status: string;
  triggeredBy: string;
  productSlug: string | null;
  createdAt: Date;
  completedAt: Date | null;
  steps: StepTrace[] | null;
  context?: unknown;
  finalState?: unknown;
}

function summarize(steps: StepTrace[] | null | undefined): {
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  skippedSteps: number;
} {
  const list = Array.isArray(steps) ? steps : [];
  return {
    totalSteps: list.length,
    completedSteps: list.filter((s) => s.status === "completed").length,
    failedSteps: list.filter((s) => s.status === "failed").length,
    skippedSteps: list.filter((s) => s.status === "skipped").length
  };
}

export async function listRecentWorkflowRuns(limit = 25): Promise<WorkflowRunSummary[]> {
  if (!process.env.DATABASE_URL) return [];
  const m = model();
  if (!m) return [];

  try {
    const rows = (await m.findMany({
      orderBy: { createdAt: "desc" },
      take: limit
    })) as RawRun[];
    return rows.map((row) => ({
      id: row.id,
      workflowId: row.workflowId,
      status: row.status,
      triggeredBy: row.triggeredBy,
      productSlug: row.productSlug,
      createdAt: row.createdAt,
      completedAt: row.completedAt,
      ...summarize(row.steps)
    }));
  } catch {
    return [];
  }
}

export async function getWorkflowRunDetail(id: string): Promise<WorkflowRunDetail | null> {
  if (!process.env.DATABASE_URL) return null;
  const m = model();
  if (!m) return null;

  try {
    const row = (await m.findUnique({ where: { id } })) as RawRun | null;
    if (!row) return null;
    const steps: StepTrace[] = Array.isArray(row.steps) ? row.steps : [];
    return {
      id: row.id,
      workflowId: row.workflowId,
      status: row.status,
      triggeredBy: row.triggeredBy,
      productSlug: row.productSlug,
      createdAt: row.createdAt,
      completedAt: row.completedAt,
      context: row.context,
      finalState: row.finalState,
      steps,
      ...summarize(steps)
    };
  } catch {
    return null;
  }
}
