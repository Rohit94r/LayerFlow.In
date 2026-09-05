import { createOpenAICompatibleAdapter } from "./openai-compatible";

/**
 * OpenCode Zen — OpenAI-compatible hosted gateway (big-pickle, DeepSeek V4,
 * and free community models). Base URL follows the Zen OpenAI-compatible
 * surface: https://opencode.ai/zen/v1.
 */
export const opencodeAdapter = createOpenAICompatibleAdapter({
  provider: "opencode",
  baseUrl: "https://opencode.ai/zen/v1",
});