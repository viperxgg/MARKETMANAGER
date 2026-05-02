type PublishToFacebookInput = {
  message: string;
  imageUrl?: string | null;
};

type FacebookPublishResult = {
  success: boolean;
  postId?: string;
  error?: string;
};

const DISABLED_ERROR =
  "Legacy direct Facebook publisher is disabled. Use the approval dispatcher.";

/**
 * @deprecated Direct Facebook publishing is quarantined. Facebook publishing
 * must go through approve-and-dispatch flow only.
 */
export function isFacebookPublishingConfigured() {
  return false;
}

/**
 * @deprecated This legacy direct publisher intentionally performs no network
 * request. Use dispatch("facebook.publish_post", ...) from the approval flow.
 */
export async function publishToFacebook(
  _input: PublishToFacebookInput
): Promise<FacebookPublishResult> {
  return {
    success: false,
    error: DISABLED_ERROR
  };
}
