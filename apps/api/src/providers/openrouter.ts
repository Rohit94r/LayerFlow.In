import { createOpenAICompatibleAdapter } from "./openai-compatible";

export const openrouterAdapter = createOpenAICompatibleAdapter({
  provider: "openrouter",
  baseUrl: "https://openrouter.ai/api/v1",
  extraHeaders: () => ({
    "HTTP-Referer": "https://layerflow.dev",
    "X-Title": "LayerFlow",
  }),
});
