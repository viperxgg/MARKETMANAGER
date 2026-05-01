/**
 * Meta Graph API client. The ONLY file in the project that calls Facebook directly.
 * Reads credentials from env vars only — never logs or returns them.
 */

interface FacebookConfig {
  pageId: string;
  accessToken: string;
}

export function getFacebookConfig(): FacebookConfig | null {
  const pageId = process.env.META_PAGE_ID;
  const accessToken = process.env.META_ACCESS_TOKEN;
  if (!pageId || !accessToken) return null;
  return { pageId, accessToken };
}

export function isFacebookConfigured(): boolean {
  return getFacebookConfig() !== null;
}

interface PublishOptions {
  message: string;
  imageUrl?: string | null;
}

export interface PublishOutcome {
  success: boolean;
  postId?: string;
  error?: string;
}

function safeError(payload: unknown): string {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    payload.error &&
    typeof payload.error === "object" &&
    "message" in payload.error
  ) {
    return String(payload.error.message).slice(0, 500);
  }
  return "Facebook publishing failed.";
}

export async function publish(opts: PublishOptions): Promise<PublishOutcome> {
  const config = getFacebookConfig();
  if (!config) return { success: false, error: "Facebook not configured" };

  const hasImage = Boolean(opts.imageUrl);
  const endpoint = hasImage
    ? `https://graph.facebook.com/${config.pageId}/photos`
    : `https://graph.facebook.com/${config.pageId}/feed`;

  const body = new URLSearchParams();
  if (hasImage && opts.imageUrl) {
    body.set("url", opts.imageUrl);
    body.set("caption", opts.message);
  } else {
    body.set("message", opts.message);
  }
  body.set("access_token", config.accessToken);

  try {
    const response = await fetch(endpoint, { method: "POST", body });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      return { success: false, error: safeError(payload) };
    }
    const postId =
      payload && typeof payload === "object"
        ? typeof (payload as { post_id?: string }).post_id === "string"
          ? (payload as { post_id?: string }).post_id
          : typeof (payload as { id?: string }).id === "string"
            ? (payload as { id?: string }).id
            : undefined
        : undefined;
    return { success: true, postId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message.slice(0, 500) : "Facebook publishing failed."
    };
  }
}
