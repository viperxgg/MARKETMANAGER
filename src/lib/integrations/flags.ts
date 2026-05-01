import type { IntegrationId } from "./types";

/**
 * Central feature-flag registry. Every external execution must opt in here
 * AND have its credentials configured. Default OFF.
 *
 * Set per environment in Vercel or .env:
 *   ENABLE_FACEBOOK=true
 *   ENABLE_EMAIL=true
 *   ENABLE_GITHUB=true
 *   ENABLE_VERCEL=true
 *   ENABLE_LEADS=true
 */
const FLAG_NAMES: Record<IntegrationId, string> = {
  facebook: "ENABLE_FACEBOOK",
  email: "ENABLE_EMAIL",
  github: "ENABLE_GITHUB",
  vercel: "ENABLE_VERCEL",
  leads: "ENABLE_LEADS",
  // openai is enabled implicitly by OPENAI_API_KEY presence — generation is core
  openai: "ENABLE_OPENAI"
};

export function isIntegrationEnabled(id: IntegrationId): boolean {
  // openai defaults to enabled when the API key is present.
  if (id === "openai") {
    return Boolean(process.env.OPENAI_API_KEY);
  }
  const flag = FLAG_NAMES[id];
  return process.env[flag] === "true";
}

export function flagNameFor(id: IntegrationId): string {
  return FLAG_NAMES[id];
}
