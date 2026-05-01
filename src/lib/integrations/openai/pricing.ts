/**
 * OpenAI pricing — USD per token (input/output) and per image.
 * Update when OpenAI publishes new prices.
 *
 * Falls back to a conservative default for unknown models so cost tracking
 * always returns a number rather than zero.
 */

export interface TextPricing {
  inputPerToken: number;
  outputPerToken: number;
}

export interface ImagePricing {
  perImage: Record<string, number>; // keyed by size, e.g. "1024x1024"
  default: number;
}

const TEXT_PRICING: Record<string, TextPricing> = {
  "gpt-4o-mini": { inputPerToken: 0.15 / 1_000_000, outputPerToken: 0.6 / 1_000_000 },
  "gpt-4.1-mini": { inputPerToken: 0.4 / 1_000_000, outputPerToken: 1.6 / 1_000_000 },
  "gpt-4.1": { inputPerToken: 2 / 1_000_000, outputPerToken: 8 / 1_000_000 },
  "gpt-4o": { inputPerToken: 2.5 / 1_000_000, outputPerToken: 10 / 1_000_000 }
};

const TEXT_FALLBACK: TextPricing = {
  inputPerToken: 1 / 1_000_000,
  outputPerToken: 4 / 1_000_000
};

const IMAGE_PRICING: Record<string, ImagePricing> = {
  "dall-e-3": {
    perImage: {
      "1024x1024": 0.04,
      "1024x1792": 0.08,
      "1792x1024": 0.08
    },
    default: 0.08
  },
  "gpt-image-1": {
    perImage: {
      "1024x1024": 0.042,
      "1024x1536": 0.063,
      "1536x1024": 0.063
    },
    default: 0.063
  }
};

const IMAGE_FALLBACK: ImagePricing = {
  perImage: {},
  default: 0.05
};

export function priceText(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const p = TEXT_PRICING[model] ?? TEXT_FALLBACK;
  return inputTokens * p.inputPerToken + outputTokens * p.outputPerToken;
}

export function priceImage(model: string, size: string, count = 1): number {
  const key = Object.keys(IMAGE_PRICING).find((k) =>
    model.toLowerCase().includes(k.toLowerCase())
  );
  const p = key ? IMAGE_PRICING[key] : IMAGE_FALLBACK;
  const per = p.perImage[size] ?? p.default;
  return per * count;
}
