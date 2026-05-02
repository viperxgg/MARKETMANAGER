import { z } from "zod";

/**
 * Centralised environment validation.
 *
 * Use cases:
 *   - `assertRequiredEnv()` — call from server actions / route handlers that
 *     MUST have DB + auth configured. Throws a clear error if any required
 *     variable is missing or empty.
 *   - `getEnvHealth()` — call from /admin/integrations (or Settings) to
 *     surface which variables are missing without throwing.
 *
 * NEVER read or return the actual values — only their presence + emptiness.
 */

const REQUIRED = [
  "DATABASE_URL",
  "AUTH_SECRET",
  "AUTH_USERNAME",
  "AUTH_PASSWORD",
  "AUTH_URL"
] as const;

const RECOMMENDED = ["DIRECT_URL", "OWNER_EMAIL", "OPENAI_API_KEY", "OPENAI_MODEL"] as const;

type RequiredKey = (typeof REQUIRED)[number];

function isPresent(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

const requiredSchema = z.object(
  Object.fromEntries(
    REQUIRED.map((k) => [k, z.string().min(1, `${k} is required`)])
  ) as Record<RequiredKey, z.ZodString>
);

export class EnvValidationError extends Error {
  constructor(public missing: string[]) {
    super(
      `Missing required environment variables: ${missing.join(", ")}.\n` +
        `Set them in .env locally and in Vercel Project Settings → Environment Variables.\n` +
        `See .env.example for the full list.`
    );
    this.name = "EnvValidationError";
  }
}

/**
 * Throws EnvValidationError when any required variable is missing or empty.
 * Call from server-only code paths that absolutely require these values.
 */
export function assertRequiredEnv(): void {
  const candidate = Object.fromEntries(REQUIRED.map((k) => [k, process.env[k] ?? ""]));
  const result = requiredSchema.safeParse(candidate);
  if (!result.success) {
    const missing = result.error.issues.map((i) => i.path[0] as string);
    throw new EnvValidationError(missing);
  }
}

export interface EnvHealth {
  required: Array<{ name: string; present: boolean }>;
  recommended: Array<{ name: string; present: boolean }>;
  allRequiredPresent: boolean;
}

/**
 * Non-throwing variant for status pages. Reports presence only — never the value.
 */
export function getEnvHealth(): EnvHealth {
  const required = REQUIRED.map((name) => ({
    name,
    present: isPresent(process.env[name])
  }));
  const recommended = RECOMMENDED.map((name) => ({
    name,
    present: isPresent(process.env[name])
  }));
  return {
    required,
    recommended,
    allRequiredPresent: required.every((r) => r.present)
  };
}

export function isTestEmailRecipient(email: string | null | undefined): boolean {
  if (!email) return false;
  const ownerEmail = process.env.OWNER_EMAIL?.trim().toLowerCase();
  return Boolean(ownerEmail && email.toLowerCase() === ownerEmail);
}

export function getTestEmailRecipients(): string[] {
  const ownerEmail = process.env.OWNER_EMAIL?.trim();
  return ownerEmail ? [ownerEmail] : [];
}
