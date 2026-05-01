import { bootstrapIntegrations } from "./bootstrap";
import { dispatch as dispatchImpl } from "./dispatcher";
import { listIntegrations } from "./registry";
import { routeIntent } from "./router";
import type { CommandResult, ExecutionContext } from "./types";

export type {
  CommandResult,
  ExecutionContext,
  Integration,
  IntegrationCommand,
  IntegrationId,
  IntegrationStatus
} from "./types";

/**
 * The ONLY function callers (server actions, agents, workflow steps) should use
 * to invoke an external integration command.
 *
 *   const r = await dispatch("facebook.publish_post", { message, imageUrl }, {
 *     operator: { email },
 *     approvalItemId,    // required when command.requiresApproval === true
 *     dryRun: false
 *   });
 */
export async function dispatch<O = unknown>(
  commandPath: string,
  input: unknown,
  ctx: ExecutionContext
): Promise<CommandResult<O>> {
  bootstrapIntegrations();
  return dispatchImpl<O>(commandPath, input, ctx);
}

/**
 * Convenience: free-text intent → dispatch. Returns null when no rule matches —
 * caller should fall back to asking the user (or an agent) to disambiguate.
 */
export async function executeIntent<O = unknown>(
  intent: string,
  input: unknown,
  ctx: ExecutionContext
): Promise<CommandResult<O> | null> {
  const match = routeIntent(intent);
  if (!match) return null;
  return dispatch<O>(match.command, input, ctx);
}

/** Surface registered integrations + their live status (for the Settings page). */
export async function getIntegrationsOverview() {
  bootstrapIntegrations();
  const list = listIntegrations();
  return Promise.all(
    list.map(async (i) => ({
      id: i.id,
      description: i.description,
      commands: Object.keys(i.commands),
      status: await i.status()
    }))
  );
}
