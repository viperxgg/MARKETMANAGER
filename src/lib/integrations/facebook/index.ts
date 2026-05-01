import { isFacebookConfigured } from "./client";
import { publishPost } from "./commands";
import { isIntegrationEnabled } from "../flags";
import type { Integration } from "../types";

export const facebookIntegration: Integration = {
  id: "facebook",
  description: "Meta Graph API publishing for the configured Facebook page.",
  async status() {
    const configured = isFacebookConfigured();
    return {
      configured,
      enabled: isIntegrationEnabled("facebook"),
      detail: configured ? "META_PAGE_ID + META_ACCESS_TOKEN present" : "missing META credentials",
      missingEnvVars: configured ? [] : ["META_PAGE_ID", "META_ACCESS_TOKEN"]
    };
  },
  commands: {
    [publishPost.id]: publishPost
  }
};
