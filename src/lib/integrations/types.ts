import type { ZodType, ZodTypeDef } from "zod";

export type IntegrationId =
  | "facebook"
  | "email"
  | "github"
  | "vercel"
  | "leads"
  | "openai";

export interface IntegrationStatus {
  configured: boolean;
  enabled: boolean;
  /** Per-integration human-readable detail. Never includes secrets. */
  detail: string;
  missingEnvVars: string[];
}

export interface ExecutionContext {
  operator: { email: string };
  /** When the command requires approval, this MUST resolve to an approved ApprovalItem. */
  approvalItemId?: string;
  /** When true, the command should not perform any network calls or DB mutations. */
  dryRun: boolean;
  /** Optional link to the workflow run that triggered this dispatch. */
  workflowRunId?: string;
}

export interface CommandResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  /** External provider id (e.g. Facebook post id, Resend message id, GitHub issue number). */
  externalId?: string;
  /** Optional cost reporting for paid APIs. */
  cost?: { usd: number };
  /** Filled by the dispatcher; integrations need not set it. */
  executionLogId?: string;
}

export interface IntegrationCommand<I = unknown, O = unknown> {
  id: string;
  description: string;
  /**
   * Zod schema. The third type parameter is left open (`any`) so schemas with
   * `.default()` / `.transform()` (where parsed output ≠ raw input) still match.
   * The OUTPUT must match `I` — that's what `execute(input: I, ...)` receives.
   */
  schema: ZodType<I, ZodTypeDef, any>;
  /** When true, dispatcher requires ctx.approvalItemId to point at an approved row. */
  requiresApproval: boolean;
  execute(input: I, ctx: ExecutionContext): Promise<CommandResult<O>>;
}

export interface Integration {
  id: IntegrationId;
  description: string;
  status(): Promise<IntegrationStatus>;
  commands: Record<string, IntegrationCommand<unknown, unknown>>;
}

export class DispatchError extends Error {
  constructor(public reason: string, public detail: string) {
    super(`Dispatch failed [${reason}]: ${detail}`);
    this.name = "DispatchError";
  }
}
