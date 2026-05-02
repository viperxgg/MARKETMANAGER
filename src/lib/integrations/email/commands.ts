import { z } from "zod";
import { sendEmail } from "./client";
import { isTestEmailRecipient } from "@/lib/env";
import type { IntegrationCommand } from "../types";

export const sendEmailSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(2).max(200),
  text: z.string().min(2).max(8000),
  html: z.string().max(20000).optional(),
  replyTo: z.string().email().optional()
});

export const sendEmailCommand: IntegrationCommand<
  z.infer<typeof sendEmailSchema>,
  { messageId?: string }
> = {
  id: "send_email",
  description: "Send a transactional email via Resend. Requires owner approval.",
  schema: sendEmailSchema,
  requiresApproval: true,
  async execute(input) {
    const result = await sendEmail({
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
      replyTo: input.replyTo
    });
    return {
      success: result.success,
      data: { messageId: result.messageId },
      error: result.error,
      externalId: result.messageId
    };
  }
};

/**
 * Self-test email with maximum safety constraints:
 *   - recipient MUST match OWNER_EMAIL (validated here too, not just upstream)
 *   - subject + body are FIXED templates — caller cannot inject content
 *   - no approval gate (the operator's click on /admin/test-email IS the approval)
 *   - still goes through dispatch() → ExecutionLog audit row + ENABLE_EMAIL flag check
 */
export const sendTestEmailSchema = z.object({
  to: z.string().email()
});

export const sendTestEmail: IntegrationCommand<
  z.infer<typeof sendTestEmailSchema>,
  { messageId?: string }
> = {
  id: "send_test_email",
  description:
    "Send a fixed-template integration-test email. Recipient must match OWNER_EMAIL.",
  schema: sendTestEmailSchema,
  requiresApproval: false,
  async execute(input) {
    if (!isTestEmailRecipient(input.to)) {
      return {
        success: false,
        error: "Recipient is not OWNER_EMAIL"
      };
    }
    const text =
      "If you received this, your Resend integration is working correctly.\n\n" +
      "— Smart Art AI integration audit (test email)";
    const html =
      '<div style="font-family:system-ui,sans-serif;max-width:480px;padding:24px;border:1px solid #ddd;border-radius:8px;">' +
      "<h2 style=\"margin:0 0 12px\">Integration test passed</h2>" +
      '<p>If you received this, your Resend integration is working correctly.</p>' +
      '<p style="color:#888;font-size:12px;margin-top:18px;">— Smart Art AI integration audit</p>' +
      "</div>";
    const result = await sendEmail({
      to: input.to,
      subject: "[Smart Art AI] Integration test",
      text,
      html
    });
    return {
      success: result.success,
      data: { messageId: result.messageId },
      error: result.error,
      externalId: result.messageId
    };
  }
};
