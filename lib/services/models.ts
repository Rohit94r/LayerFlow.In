// ─────────────────────────────────────────────────────────────
// Model hub + provider keys service.
//
// Mock-backed today (lib/data/providers.ts). The live backend
// serves the model registry and provider keys via lib/api.
// ─────────────────────────────────────────────────────────────

import { MODELS, MODEL_BY_ID, PROVIDER_KEYS, estimateCost } from "@/lib/data/providers";
import type { ModelInfo, ProviderKey } from "@/lib/types";

export interface ModelHubService {
  listModels(): Promise<ModelInfo[]>;
  getModel(id: string): Promise<ModelInfo | null>;
  listProviderKeys(): Promise<ProviderKey[]>;
  estimateCost(modelId: string, tokensIn: number, tokensOut: number): Promise<number>;
}

export const modelService: ModelHubService = {
  async listModels() {
    return MODELS;
  },

  async getModel(id) {
    return MODEL_BY_ID[id] ?? null;
  },

  async listProviderKeys() {
    return PROVIDER_KEYS;
  },

  async estimateCost(modelId, tokensIn, tokensOut) {
    return estimateCost(modelId, tokensIn, tokensOut);
  },
};
