import { createOpenAICompatibleAdapter } from "./openai-compatible";

export const openaiAdapter = createOpenAICompatibleAdapter({
  provider: "openai",
  baseUrl: "https://api.openai.com/v1",
});
