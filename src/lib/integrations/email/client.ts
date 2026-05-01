/**
 * Resend client. The ONLY file that calls the Resend API directly.
 * Reads RESEND_API_KEY + RESEND_FROM from env vars.
 */

interface ResendConfig {
  apiKey: string;
  from: string;
}

export function getResendConfig(): ResendConfig | null {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!apiKey || !from) return null;
  return { apiKey, from };
}

export function isEmailConfigured(): boolean {
  return getResendConfig() !== null;
}

export interface SendOptions {
  to: string;
  subject: string;
  html?: string;
  text: string;
  replyTo?: string;
}

export interface SendOutcome {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendEmail(opts: SendOptions): Promise<SendOutcome> {
  const config = getResendConfig();
  if (!config) return { success: false, error: "Email not configured" };

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: config.from,
        to: opts.to,
        subject: opts.subject,
        text: opts.text,
        html: opts.html,
        reply_to: opts.replyTo
      })
    });
    const payload = (await response.json().catch(() => null)) as
      | { id?: string; message?: string; name?: string }
      | null;

    if (!response.ok) {
      const message = payload?.message ?? payload?.name ?? `Resend ${response.status}`;
      return { success: false, error: String(message).slice(0, 500) };
    }
    return { success: true, messageId: payload?.id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message.slice(0, 500) : "Email send failed"
    };
  }
}
