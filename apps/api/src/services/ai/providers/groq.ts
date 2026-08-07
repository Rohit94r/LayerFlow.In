import { createOpenAICompatibleAdapter } from "./openai-compatible";

export const groqAdapter = createOpenAICompatibleAdapter({
  provider: "groq",
  baseUrl: "https://api.groq.com/openai/v1",
});
