import { prisma } from "@/lib/db";
import type { CommandResult, ExecutionContext, IntegrationId } from "./types";

/**
 * Append-only audit of every external execution attempt.
 *
 * Degrades gracefully when DB is unavailable or the ExecutionLog model isn't
 * yet generated — returns null id and the dispatch continues. After the
 * Prisma client is regenerated (post db:push) this becomes fully typed.
 */

interface PrismaWithExecutionLog {
  executionLog?: {
    create: (args: { data: Record<string, unknown> }) => Promise<{ id: string }>;
    update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<unknown>;
  };
}

function model() {
  const p = prisma as unknown as PrismaWithExecutionLog;
  return p.executionLog;
}

/** Strip obvious secrets before persisting. */
function sanitize(input: unknown): unknown {
  if (!input || typeof input !== "object") return input;
  const cleaned: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (/secret|token|password|api[_-]?key|access[_-]?token/i.test(k)) {
      cleaned[k] = "[REDACTED]";
    } else if (typeof v === "string" && v.length > 4000) {
      cleaned[k] = `${v.slice(0, 4000)}…[truncated]`;
    } else {
      cleaned[k] = v;
    }
  }
  return cleaned;
}

export interface AuditStartArgs {
  integrationId: IntegrationId;
  commandId: string;
  ctx: ExecutionContext;
  input: unknown;
  requiresApproval: boolean;
}

export async function auditStart(args: AuditStartArgs): Promise<string | null> {
  const m = model();
  if (!m) return null;
  try {
    const row = await m.create({
      data: {
        integrationId: args.integrationId,
        commandId: args.commandId,
        operatorEmail: args.ctx.operator.email,
        approvalItemId: args.ctx.approvalItemId ?? null,
        workflowRunId: args.ctx.workflowRunId ?? null,
        requiresApproval: args.requiresApproval,
        dryRun: args.ctx.dryRun,
        input: sanitize(args.input) as object,
        status: "started"
      }
    });
    return row.id;
  } catch {
    return null;
  }
}

export async function auditFinish(
  logId: string | null,
  result: CommandResult,
  durationMs: number
): Promise<void> {
  if (!logId) return;
  const m = model();
  if (!m) return;
  try {
    await m.update({
      where: { id: logId },
      data: {
        status: result.success ? "succeeded" : "failed",
        result: (result.data ?? null) as object,
        externalId: result.externalId ?? null,
        error: result.error ?? null,
        costUsd: result.cost?.usd ?? null,
        durationMs,
        completedAt: new Date()
      }
    });
  } catch {
    /* swallow — never throw from the audit layer */
  }
}
