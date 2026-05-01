import { emailIntegration } from "./email";
import { facebookIntegration } from "./facebook";
import { githubIntegration } from "./github";
import { leadsIntegration } from "./leads";
import { openAiIntegration } from "./openai";
import { hasIntegration, registerIntegration } from "./registry";
import { vercelIntegration } from "./vercel";

let booted = false;

/**
 * Idempotent. Registers every integration once. Called automatically by
 * `dispatch()` on first use.
 */
export function bootstrapIntegrations(): void {
  if (booted) return;
  if (!hasIntegration(openAiIntegration.id)) registerIntegration(openAiIntegration);
  if (!hasIntegration(facebookIntegration.id)) registerIntegration(facebookIntegration);
  if (!hasIntegration(emailIntegration.id)) registerIntegration(emailIntegration);
  if (!hasIntegration(githubIntegration.id)) registerIntegration(githubIntegration);
  if (!hasIntegration(vercelIntegration.id)) registerIntegration(vercelIntegration);
  if (!hasIntegration(leadsIntegration.id)) registerIntegration(leadsIntegration);
  booted = true;
}
