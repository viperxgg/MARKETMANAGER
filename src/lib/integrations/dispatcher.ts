import { prisma } from "@/lib/db";
import { auditFinish, auditStart } from "./audit";
import { isIntegrationEnabled } from "./flags";
import { getIntegration } from "./registry";
import type { CommandResult, ExecutionContext, IntegrationId } from "./types";

/**
 * The ONLY way to invoke an external command. Enforces the 4 invariants:
 *   1. Command must exist
 *   2. Integration feature flag must be ON
 *   3. If command.requiresApproval: ctx.approvalItemId must point at an approved row
 *   4. Every dispatch — success or failure — writes one ExecutionLog row
 *
 * Never throws. Failures land in `result.success === false`.
 */
export async function dispatch<O = unknown>(
  commandPath: string,
  input: unknown,
  ctx: ExecutionContext
): Promise<CommandResult<O>> {
  const startedAt = Date.now();
  const [intIdRaw, cmdId] = commandPath.split(".");
  const intId = intIdRaw as IntegrationId;

  // 1. Resolve integration + command
  const integration = getIntegration(intId);
  if (!integration) {
    return { success: false, error: `Unknown integration: ${intId}` };
  }
  const command = integration.commands[cmdId];
  if (!command) {
    return { success: false, error: `Unknown command: ${commandPath}` };
  }

  // 2. Feature flag
  if (!isIntegrationEnabled(intId)) {
    const result: CommandResult<O> = {
      success: false,
      error: `Integration disabled by feature flag (${intId})`
    };
    const logId = await auditStart({
      integrationId: intId,
      commandId: cmdId,
      ctx,
      input,
      requiresApproval: command.requiresApproval
    });
    await auditFinish(logId, result, Date.now() - startedAt);
    return { ...result, executionLogId: logId ?? undefined };
  }

  // 3. Validate input via the command's Zod schema BEFORE writing any audit row
  const parsed = command.schema.safeParse(input);
  if (!parsed.success) {
    const result: CommandResult<O> = {
      success: false,
      error: `Invalid input: ${parsed.error.issues.map((i) => i.message).join("; ").slice(0, 400)}`
    };
    const logId = await auditStart({
      integrationId: intId,
      commandId: cmdId,
      ctx,
      input,
      requiresApproval: command.requiresApproval
    });
    await auditFinish(logId, result, Date.now() - startedAt);
    return { ...result, executionLogId: logId ?? undefined };
  }

  // 4. Approval gate
  if (command.requiresApproval) {
    if (!ctx.approvalItemId) {
      const result: CommandResult<O> = {
        success: false,
        error: "Approval required: ctx.approvalItemId missing"
      };
      const logId = await auditStart({
        integrationId: intId,
        commandId: cmdId,
        ctx,
        input,
        requiresApproval: true
      });
      await auditFinish(logId, result, Date.now() - startedAt);
      return { ...result, executionLogId: logId ?? undefined };
    }
    const approved = await isApprovalValid(ctx.approvalItemId);
    if (!approved) {
      const result: CommandResult<O> = {
        success: false,
        error: "Approval required: ApprovalItem missing or approved_by_owner is false"
      };
      const logId = await auditStart({
        integrationId: intId,
        commandId: cmdId,
        ctx,
        input,
        requiresApproval: true
      });
      await auditFinish(logId, result, Date.now() - startedAt);
      return { ...result, executionLogId: logId ?? undefined };
    }
  }

  // 5. Audit start (we now know the call will be attempted)
  const logId = await auditStart({
    integrationId: intId,
    commandId: cmdId,
    ctx,
    input: parsed.data,
    requiresApproval: command.requiresApproval
  });

  // 6. Dry run short-circuit
  if (ctx.dryRun) {
    const result: CommandResult<O> = {
      success: true,
      data: { dryRun: true } as unknown as O,
      error: undefined
    };
    await auditFinish(logId, result, Date.now() - startedAt);
    return { ...result, executionLogId: logId ?? undefined };
  }

  // 7. Execute. Catch everything; integrations should not crash the dispatcher.
  try {
    const result = (await command.execute(parsed.data, ctx)) as CommandResult<O>;
    await auditFinish(logId, result, Date.now() - startedAt);
    return { ...result, executionLogId: logId ?? undefined };
  } catch (err) {
    const result: CommandResult<O> = {
      success: false,
      error: err instanceof Error ? err.message.slice(0, 500) : "execution threw"
    };
    await auditFinish(logId, result, Date.now() - startedAt);
    return { ...result, executionLogId: logId ?? undefined };
  }
}

async function isApprovalValid(approvalItemId: string): Promise<boolean> {
  if (!process.env.DATABASE_URL) return false;
  try {
    const row = await prisma.approvalItem.findUnique({
      where: { id: approvalItemId },
      select: { approved_by_owner: true }
    });
    return Boolean(row?.approved_by_owner);
  } catch {
    return false;
  }
}
