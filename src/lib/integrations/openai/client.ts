/**
 * OpenAI HTTP client. The ONLY file that calls api.openai.com directly.
 * Reads OPENAI_API_KEY + OPENAI_MODEL + OPENAI_IMAGE_MODEL from env.
 */

import { priceImage, priceText } from "./pricing";

interface OpenAiTextConfig {
  apiKey: string;
  model: string;
}

interface OpenAiImageConfig {
  apiKey: string;
  model: string;
}

export function getTextConfig(): OpenAiTextConfig | null {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;
  if (!apiKey || !model) return null;
  return { apiKey, model };
}

export function getImageConfig(): OpenAiImageConfig | null {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_IMAGE_MODEL || process.env.IMAGE_GENERATION_MODEL;
  if (!apiKey || !model) return null;
  return { apiKey, model };
}

export interface CompletionInput {
  system: string;
  user: string;
  /** Override OPENAI_MODEL if you need a specific model for this call. */
  model?: string;
  responseFormat?: "json_object" | "text";
  temperature?: number;
  maxOutputTokens?: number;
}

export interface CompletionOutput {
  text: string;
  modelUsed: string;
  tokens: { input: number; output: number };
  costUsd: number;
}

export async function complete(input: CompletionInput): Promise<CompletionOutput> {
  const config = getTextConfig();
  if (!config) throw new Error("OpenAI text not configured");
  const model = input.model ?? config.model;

  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: "system", content: input.system },
      { role: "user", content: input.user }
    ],
    temperature: input.temperature ?? 0.35
  };
  if (input.responseFormat === "json_object") {
    body.response_format = { type: "json_object" };
  }
  if (input.maxOutputTokens) {
    body.max_tokens = input.maxOutputTokens;
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`OpenAI ${response.status}: ${detail.slice(0, 200)}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };

  const text = payload.choices?.[0]?.message?.content;
  if (typeof text !== "string") {
    throw new Error("OpenAI response did not include content");
  }

  const inputTokens = payload.usage?.prompt_tokens ?? 0;
  const outputTokens = payload.usage?.completion_tokens ?? 0;

  return {
    text,
    modelUsed: model,
    tokens: { input: inputTokens, output: outputTokens },
    costUsd: priceText(model, inputTokens, outputTokens)
  };
}

export interface ImageInput {
  prompt: string;
  size?: string; // e.g. "1024x1024", "1792x1024"
  /** Override OPENAI_IMAGE_MODEL if a specific model is required. */
  model?: string;
}

export interface ImageOutput {
  imageUrl: string | null;
  b64Json: string | null;
  modelUsed: string;
  size: string;
  costUsd: number;
}

function defaultSizeFor(model: string): string {
  return model.toLowerCase().includes("dall-e-3") ? "1792x1024" : "1536x1024";
}

export async function generateImage(input: ImageInput): Promise<ImageOutput> {
  const config = getImageConfig();
  if (!config) throw new Error("OpenAI image not configured");
  const model = input.model ?? config.model;
  const size = input.size ?? defaultSizeFor(model);

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ model, prompt: input.prompt, size, n: 1 })
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`OpenAI image ${response.status}: ${detail.slice(0, 200)}`);
  }

  const payload = (await response.json()) as {
    data?: Array<{ url?: string; b64_json?: string }>;
  };
  const image = payload.data?.[0];
  const imageUrl = typeof image?.url === "string" ? image.url : null;
  const b64Json = typeof image?.b64_json === "string" ? image.b64_json : null;

  if (!imageUrl && !b64Json) {
    throw new Error("OpenAI image response was empty");
  }

  return {
    imageUrl,
    b64Json,
    modelUsed: model,
    size,
    costUsd: priceImage(model, size, 1)
  };
}
