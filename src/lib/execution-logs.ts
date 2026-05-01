import { prisma } from "./db";

/**
 * Defensive reader for ExecutionLog. Mirrors the pattern used by audit.ts —
 * gracefully degrades when DATABASE_URL is missing or the model isn't generated.
 *
 * Used by /admin/test-* pages to render the most recent attempt without
 * triggering a fresh API call on every page load.
 */

export interface ExecutionLogSummary {
  id: string;
  integrationId: string;
  commandId: string;
  status: string;
  operatorEmail: string;
  externalId: string | null;
  error: string | null;
  costUsd: number | null;
  durationMs: number | null;
  createdAt: Date;
  completedAt: Date | null;
  result: unknown;
}

interface PrismaWithExecutionLog {
  executionLog?: {
    findFirst: (args: unknown) => Promise<unknown>;
    findMany: (args: unknown) => Promise<unknown[]>;
  };
}

function model() {
  const p = prisma as unknown as PrismaWithExecutionLog;
  return p.executionLog;
}

export async function getLatestExecutionLog(
  integrationId: string,
  commandId: string
): Promise<ExecutionLogSummary | null> {
  if (!process.env.DATABASE_URL) return null;
  const m = model();
  if (!m) return null;
  try {
    const row = (await m.findFirst({
      where: { integrationId, commandId },
      orderBy: { createdAt: "desc" }
    })) as ExecutionLogSummary | null;
    return row ?? null;
  } catch {
    return null;
  }
}

export async function listRecentExecutionLogs(limit = 20): Promise<ExecutionLogSummary[]> {
  if (!process.env.DATABASE_URL) return [];
  const m = model();
  if (!m) return [];
  try {
    const rows = (await m.findMany({
      orderBy: { createdAt: "desc" },
      take: limit
    })) as ExecutionLogSummary[];
    return rows;
  } catch {
    return [];
  }
}
