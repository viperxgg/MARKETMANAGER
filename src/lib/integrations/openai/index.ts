import { getImageConfig, getTextConfig } from "./client";
import { completeJson, completeText, generateImageCommand } from "./commands";
import { isIntegrationEnabled } from "../flags";
import type { Integration } from "../types";

export const openAiIntegration: Integration = {
  id: "openai",
  description: "OpenAI text + image generation, behind the unified dispatcher.",
  async status() {
    const text = getTextConfig();
    const image = getImageConfig();
    const configured = Boolean(text); // text config is the minimum
    const missing: string[] = [];
    if (!text) missing.push("OPENAI_API_KEY", "OPENAI_MODEL");
    if (!image) missing.push("OPENAI_IMAGE_MODEL (or IMAGE_GENERATION_MODEL)");
    return {
      configured,
      enabled: isIntegrationEnabled("openai"),
      detail: text
        ? `text:${text.model}${image ? ` · image:${image.model}` : " · image: NOT configured"}`
        : "OpenAI not configured",
      missingEnvVars: Array.from(new Set(missing))
    };
  },
  commands: {
    [completeText.id]: completeText,
    [completeJson.id]: completeJson,
    [generateImageCommand.id]: generateImageCommand
  }
};

// Re-export the convenient client types so refactored callers can import them
// directly from @/lib/integrations/openai if they want IDE help.
export type { CompletionInput, CompletionOutput, ImageInput, ImageOutput } from "./client";
