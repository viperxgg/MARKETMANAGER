import { isEmailConfigured } from "./client";
import { sendEmailCommand, sendTestEmail } from "./commands";
import { isIntegrationEnabled } from "../flags";
import type { Integration } from "../types";

export const emailIntegration: Integration = {
  id: "email",
  description: "Transactional email via Resend.",
  async status() {
    const configured = isEmailConfigured();
    return {
      configured,
      enabled: isIntegrationEnabled("email"),
      detail: configured ? "RESEND_API_KEY + RESEND_FROM present" : "missing Resend credentials",
      missingEnvVars: configured ? [] : ["RESEND_API_KEY", "RESEND_FROM"]
    };
  },
  commands: {
    [sendEmailCommand.id]: sendEmailCommand,
    [sendTestEmail.id]: sendTestEmail
  }
};
