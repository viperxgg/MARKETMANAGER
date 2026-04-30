type PublishToFacebookInput = {
  message: string;
  imageUrl?: string | null;
};

type FacebookPublishResult = {
  success: boolean;
  postId?: string;
  error?: string;
};

function getFacebookConfig() {
  const pageId = process.env.META_PAGE_ID;
  const accessToken = process.env.META_ACCESS_TOKEN;

  if (!pageId || !accessToken) {
    return null;
  }

  return { pageId, accessToken };
}

export function isFacebookPublishingConfigured() {
  return Boolean(getFacebookConfig());
}

function safeErrorMessage(payload: unknown) {
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

export async function publishToFacebook({
  message,
  imageUrl
}: PublishToFacebookInput): Promise<FacebookPublishResult> {
  const config = getFacebookConfig();

  if (!config) {
    return {
      success: false,
      error: "Facebook not configured"
    };
  }

  const hasImage = Boolean(imageUrl);
  const endpoint = hasImage
    ? `https://graph.facebook.com/${config.pageId}/photos`
    : `https://graph.facebook.com/${config.pageId}/feed`;
  const body = new URLSearchParams();

  if (hasImage && imageUrl) {
    body.set("url", imageUrl);
    body.set("caption", message);
  } else {
    body.set("message", message);
  }

  body.set("access_token", config.accessToken);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      body
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        success: false,
        error: safeErrorMessage(payload)
      };
    }

    const postId =
      payload && typeof payload === "object"
        ? typeof payload.post_id === "string"
          ? payload.post_id
          : typeof payload.id === "string"
          ? payload.id
          : undefined
        : undefined;

    return {
      success: true,
      postId
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message.slice(0, 500) : "Facebook publishing failed."
    };
  }
}
