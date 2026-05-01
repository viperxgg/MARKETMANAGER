import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

/**
 * Webhook receiver scaffold.
 *
 * Routes are namespaced by provider. To enable a provider:
 *   1. Set WEBHOOK_SECRET_<PROVIDER> in env (e.g. WEBHOOK_SECRET_META).
 *   2. Configure the provider to POST to /api/webhooks/<provider>.
 *   3. Add a handler case in the switch below.
 *
 * Every webhook is HMAC-verified before any logic runs. Unknown providers,
 * missing secrets, or bad signatures return 401 with no body to keep
 * fingerprinting attempts blind.
 *
 * IMPORTANT: webhook routes must be allowlisted in src/middleware.ts so they
 * are reachable without an authenticated session. Add `/api/webhooks/` to the
 * early-return list before enabling any provider.
 */

function timingSafeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

function verifySignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string
): boolean {
  if (!signatureHeader) return false;
  // Many providers use "sha256=<hex>" — strip the prefix if present
  const provided = signatureHeader.replace(/^sha256=/, "");
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    return timingSafeEqualString(provided, expected);
  } catch {
    return false;
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ provider: string }> }
) {
  const { provider } = await context.params;
  const secret = process.env[`WEBHOOK_SECRET_${provider.toUpperCase()}`];
  if (!secret) {
    return new NextResponse(null, { status: 401 });
  }

  const rawBody = await request.text();
  const signature =
    request.headers.get("x-hub-signature-256") ??
    request.headers.get("x-signature") ??
    request.headers.get("x-resend-signature");

  if (!verifySignature(rawBody, signature, secret)) {
    return new NextResponse(null, { status: 401 });
  }

  // Validate payload is JSON before passing to provider-specific handlers.
  // Specific handlers will be added per-provider — they should re-parse and
  // narrow the type then. We only reject malformed JSON here.
  try {
    JSON.parse(rawBody);
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  switch (provider) {
    case "meta":
      // TODO: handle FB engagement events → write to PublishLog or AgencyMemory
      return NextResponse.json({ received: true });
    case "resend":
      // TODO: handle email delivery / bounce events
      return NextResponse.json({ received: true });
    case "github":
      // TODO: handle push / issue events → trigger workflows
      return NextResponse.json({ received: true });
    default:
      return new NextResponse(null, { status: 404 });
  }
}

// Some providers do a GET handshake to verify the endpoint exists.
export async function GET(
  request: Request,
  context: { params: Promise<{ provider: string }> }
) {
  const { provider } = await context.params;
  const url = new URL(request.url);
  const challenge = url.searchParams.get("hub.challenge");
  if (provider === "meta" && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse(null, { status: 200 });
}
