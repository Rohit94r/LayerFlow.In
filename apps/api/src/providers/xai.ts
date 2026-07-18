import { createOpenAICompatibleAdapter } from "./openai-compatible";

export const xaiAdapter = createOpenAICompatibleAdapter({
  provider: "xai",
  baseUrl: "https://api.x.ai/v1",
});
