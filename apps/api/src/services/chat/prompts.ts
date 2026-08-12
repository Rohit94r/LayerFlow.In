import { getModel, type Provider } from "@layerflow/model-registry";

/**
 * Per-provider generation defaults for chat.
 *
 * The whole point of provider isolation is that switching the model must never
 * inherit the previous model's persona, temperature, or formatting. Every
 * request is rebuilt with THIS provider's system prompt and temperature, so a
 * switch to DeepSeek answers like DeepSeek — never like GPT.
 */

/** Sampling temperature per provider. Omit → provider default. */
export const DEFAULT_TEMPERATURE: Record<Provider, number> = {
  openai: 0.7,
  anthropic: 0.7,
  google: 0.7,
  deepseek: 0.6,
  groq: 0.7,
  xai: 0.8,
  kimi: 0.7,
  openrouter: 0.7,
};

export function defaultTemperature(provider: Provider): number {
  return DEFAULT_TEMPERATURE[provider] ?? 0.7;
}

/**
 * System prompt per provider. Each prompt anchors the model identity and the
 * response format, so a response "clearly comes from DeepSeek" (requirement:
 * no residual GPT reasoning style after a switch).
 */
const SYSTEM_PROMPTS: Record<Provider, string> = {
  openai:
    "You are GPT, the OpenAI assistant powering LayerFlow. Be precise, helpful, and direct. " +
    "Use Markdown for structure only when it genuinely improves clarity — code blocks for code, " +
    "lists or tables when enumeration helps. Never mention that you are 'another model' or claim a " +
    "different identity.",
  anthropic:
    "You are Claude, the Anthropic assistant powering LayerFlow. Reason carefully and give thorough, " +
    "well-organized answers. Use Markdown headings, lists, and code blocks where they aid readability. " +
    "Be honest about uncertainty.",
  google:
    "You are Gemini, Google's assistant powering LayerFlow. Give well-structured, comprehensive answers " +
    "with clear headings and Markdown formatting. Be concise where a short answer suffices and detailed " +
    "where the question is complex.",
  deepseek:
    "You are DeepSeek, a precise and efficient assistant powering LayerFlow. Answer concisely and to the " +
    "point: short, clear sentences, no filler. Use Markdown for code blocks and lists when helpful, and " +
    "stop once the question is fully answered.",
  groq:
    "You are Llama served on Groq, a very fast open-model assistant powering LayerFlow. Be direct and " +
    "practical, answer in plain language, and use Markdown when it helps.",
  xai:
    "You are Grok, the xAI assistant powering LayerFlow. Be witty but substantive, give direct answers, " +
    "and use Markdown for structure where useful.",
  kimi:
    "You are Kimi, the Moonshot AI assistant powering LayerFlow. Be thorough and well-organized, using " +
    "Markdown headings and lists to structure longer answers.",
  openrouter:
    "You are the AI assistant the user selected through OpenRouter for LayerFlow. Match the best practices " +
    "of the model you are: clear, structured Markdown, direct answers, and no claim of a different identity.",
};

export function providerSystemPrompt(provider: Provider): string {
  return SYSTEM_PROMPTS[provider] ?? SYSTEM_PROMPTS.openai;
}

/**
 * Smart-context budgets (tokens). Cheap models target ~4k input; premium
 * models get ~8k. Only the recent window + one summary block must fit, which
 * keeps long conversations cheap and fast.
 */
export const CHEAP_CONTEXT_BUDGET_TOKENS = 4_000;
export const PREMIUM_CONTEXT_BUDGET_TOKENS = 8_000;

/** Premium = flagship-priced input; everything else is treated as cheap. */
const PREMIUM_INPUT_PRICE_MICRO = 1_000_000;

export function tokenBudgetForModel(modelId: string): number {
  const info = getModel(modelId);
  if (info && info.inputPricePerMTokMicro >= PREMIUM_INPUT_PRICE_MICRO) {
    return PREMIUM_CONTEXT_BUDGET_TOKENS;
  }
  return CHEAP_CONTEXT_BUDGET_TOKENS;
}
