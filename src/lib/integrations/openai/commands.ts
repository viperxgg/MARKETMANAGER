import { z } from "zod";
import { complete, generateImage } from "./client";
import type { IntegrationCommand } from "../types";

/**
 * Three commands cover every OpenAI call site in the project:
 *   • complete_text  — free-form text completion
 *   • complete_json  — structured (response_format=json_object) completion
 *   • generate_image — image generation
 *
 * None require approval. Generation produces drafts; the drafts themselves
 * are approval-gated downstream.
 */

const completionSchema = z.object({
  system: z.string().min(1).max(20_000),
  user: z.string().min(1).max(60_000),
  model: z.string().max(120).optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxOutputTokens: z.number().int().min(1).max(16_000).optional()
});

export const completeText: IntegrationCommand<
  z.infer<typeof completionSchema>,
  { text: string; modelUsed: string; tokens: { input: number; output: number } }
> = {
  id: "complete_text",
  description: "Free-form text completion via OpenAI chat.completions.",
  schema: completionSchema,
  requiresApproval: false,
  async execute(input) {
    const result = await complete({ ...input, responseFormat: "text" });
    return {
      success: true,
      data: { text: result.text, modelUsed: result.modelUsed, tokens: result.tokens },
      cost: { usd: result.costUsd }
    };
  }
};

export const completeJson: IntegrationCommand<
  z.infer<typeof completionSchema>,
  { text: string; modelUsed: string; tokens: { input: number; output: number } }
> = {
  id: "complete_json",
  description:
    "Structured JSON completion via OpenAI chat.completions (response_format=json_object).",
  schema: completionSchema,
  requiresApproval: false,
  async execute(input) {
    const result = await complete({ ...input, responseFormat: "json_object" });
    return {
      success: true,
      data: { text: result.text, modelUsed: result.modelUsed, tokens: result.tokens },
      cost: { usd: result.costUsd }
    };
  }
};

const imageSchema = z.object({
  prompt: z.string().min(5).max(8000),
  size: z.string().regex(/^\d{3,5}x\d{3,5}$/).optional(),
  model: z.string().max(120).optional()
});

export const generateImageCommand: IntegrationCommand<
  z.infer<typeof imageSchema>,
  { imageUrl: string | null; b64Json: string | null; modelUsed: string; size: string }
> = {
  id: "generate_image",
  description: "Image generation via OpenAI images.generations.",
  schema: imageSchema,
  requiresApproval: false,
  async execute(input) {
    const result = await generateImage(input);
    return {
      success: true,
      data: {
        imageUrl: result.imageUrl,
        b64Json: result.b64Json,
        modelUsed: result.modelUsed,
        size: result.size
      },
      cost: { usd: result.costUsd },
      externalId: result.imageUrl ?? undefined
    };
  }
};
