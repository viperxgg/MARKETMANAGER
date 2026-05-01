import { dispatch } from "../index";
import type { ExecutionContext } from "../types";

/**
 * Convenience wrappers used by lib/* modules so they don't have to construct
 * an ExecutionContext for every call. These are NOT a backdoor — they go
 * through dispatch() like every other integration call (audit log, feature
 * flag, Zod validation).
 *
 * Use these when the call site has no operator context (e.g. agency-brain,
 * content-studio). When called from a workflow step, prefer dispatch()
 * directly so workflowRunId can be threaded into the audit log.
 */

function systemContext(): ExecutionContext {
  return {
    operator: { email: process.env.OWNER_EMAIL ?? "system" },
    dryRun: false
  };
}

export interface CompleteJsonArgs {
  system: string;
  user: string;
  temperature?: number;
  model?: string;
}

/**
 * Returns the raw model text (caller parses + validates with their own Zod schema).
 * Throws on dispatch failure so existing try/catch blocks behave the same.
 */
export async function completeJsonViaDispatch(args: CompleteJsonArgs): Promise<string> {
  const result = await dispatch<{ text: string }>(
    "openai.complete_json",
    {
      system: args.system,
      user: args.user,
      temperature: args.temperature,
      model: args.model
    },
    systemContext()
  );
  if (!result.success || !result.data?.text) {
    throw new Error(result.error ?? "OpenAI dispatch failed");
  }
  return result.data.text;
}

export interface GenerateImageArgs {
  prompt: string;
  size?: string;
  model?: string;
}

export interface GeneratedImage {
  imageUrl: string | null;
  b64Json: string | null;
  modelUsed: string;
  size: string;
}

export async function generateImageViaDispatch(args: GenerateImageArgs): Promise<GeneratedImage> {
  const result = await dispatch<GeneratedImage>(
    "openai.generate_image",
    args,
    systemContext()
  );
  if (!result.success || !result.data) {
    // Preserve the legacy error code so existing notice-handling still works
    throw new Error(result.error ?? "OPENAI_IMAGE_GENERATION_FAILED");
  }
  return result.data;
}
