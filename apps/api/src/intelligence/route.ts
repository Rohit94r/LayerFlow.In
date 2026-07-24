import type { ExecutionMode, RouteResponse } from "@layerflow/contracts";
import { resolveProvider } from "@layerflow/model-registry";
import { providerForModel } from "./analyze";
import { recommend, type RoutingRuleMatchInput } from "./recommend";

export interface RouteInput {
  content: string;
  requestedModel?: string;
  executionMode: ExecutionMode;
  preferCheap: boolean;
  defaultModel: string;
  rules: RoutingRuleMatchInput[];
}

/**
 * Auto Mode model selection. ALWAYS returns an explanation string.
 * Manual / Suggest modes return the requested (or default) model unless
 * Prefer-cheap is on (then we still route via recommend).
 */
export function routeModel(input: RouteInput): RouteResponse {
  const isAuto = input.executionMode.startsWith("auto-");
  const shouldRoute = isAuto || input.preferCheap;

  if (!shouldRoute) {
    const model = input.requestedModel ?? input.defaultModel;
    const provider = resolveProvider(model) ?? "openai";
    return {
      model,
      provider,
      explanation:
        input.executionMode === "manual"
          ? `Manual mode: using ${model}`
          : `Suggest mode: using ${model} (recommendation available via /recommend)`,
      source: "manual",
      matchedRuleId: null,
    };
  }

  const { recommendation } = recommend({
    content: input.content,
    currentModel: input.requestedModel ?? input.defaultModel,
    preferCheap: input.preferCheap,
    executionMode: isAuto ? input.executionMode : "auto-cheapest",
    rules: input.rules,
  });

  const model = recommendation.recommendedModel;
  const provider = resolveProvider(model) ?? "openai";

  return {
    model,
    provider,
    explanation: input.preferCheap && !isAuto
      ? `Prefer cheap: ${recommendation.reason}`
      : recommendation.reason,
    source: recommendation.source === "rule" ? "rule" : "heuristic",
    matchedRuleId: recommendation.matchedRuleId ?? null,
  };
}

export { providerForModel };
