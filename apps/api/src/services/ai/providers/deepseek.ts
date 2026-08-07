import { createOpenAICompatibleAdapter } from "./openai-compatible";

export const deepseekAdapter = createOpenAICompatibleAdapter({
  provider: "deepseek",
  baseUrl: "https://api.deepseek.com/v1",
});
