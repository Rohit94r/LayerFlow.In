import { createOpenAICompatibleAdapter } from "./openai-compatible";
import { getEnv } from "../../../config/env";

/**
 * Kimi (Moonshot AI) — OpenAI-compatible chat API.
 * Defaults to the international endpoint; override with KIMI_BASE_URL for
 * api.moonshot.cn (mainland China) deployments.
 */
export const kimiAdapter = createOpenAICompatibleAdapter({
  provider: "kimi",
  get baseUrl() {
    return getEnv().KIMI_BASE_URL ?? "https://api.moonshot.ai/v1";
  },
});
