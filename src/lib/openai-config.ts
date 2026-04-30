export const openAiTextConfigurationError = "OPENAI_TEXT_CONFIGURATION_MISSING";
export const openAiImageConfigurationError = "OPENAI_IMAGE_CONFIGURATION_MISSING";

export function isOpenAiTextConfigured() {
  return Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL);
}

export function getOpenAiTextConfig() {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;

  if (!apiKey || !model) {
    throw new Error(openAiTextConfigurationError);
  }

  return { apiKey, model };
}

export function isOpenAiImageConfigured() {
  return Boolean(
    process.env.OPENAI_API_KEY && (process.env.OPENAI_IMAGE_MODEL || process.env.IMAGE_GENERATION_MODEL)
  );
}

export function getOpenAiImageConfig() {
  const apiKey = process.env.OPENAI_API_KEY;
  const imageModel = process.env.OPENAI_IMAGE_MODEL || process.env.IMAGE_GENERATION_MODEL;

  if (!apiKey || !imageModel) {
    throw new Error(openAiImageConfigurationError);
  }

  return { apiKey, imageModel };
}
