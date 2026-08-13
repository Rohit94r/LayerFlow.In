// ─────────────────────────────────────────────────────────────
// Model hub + provider keys service.
//
// The model catalog is static reference data (lib/data/providers);
// provider keys come from the live API (apps/api/src/routes/keys).
// ─────────────────────────────────────────────────────────────

import {
  createProviderKeyResponseSchema,
  deleteProviderKeyResponseSchema,
  listProviderKeysResponseSchema,
} from "@layerflow/contracts";
import { apiFetch, getServerCookieHeader } from "@/lib/api/client";
import { MODELS, MODEL_BY_ID, estimateCost } from "@/lib/data/providers";
import type { ModelInfo, ProviderKey } from "@/lib/types";

export interface ModelHubService {
  listModels(): Promise<ModelInfo[]>;
  getModel(id: string): Promise<ModelInfo | null>;
  listProviderKeys(): Promise<ProviderKey[]>;
  createProviderKey(input: {
    provider: string;
    secret: string;
    label?: string;
  }): Promise<ProviderKey>;
  revokeProviderKey(id: string): Promise<void>;
  estimateCost(modelId: string, tokensIn: number, tokensOut: number): Promise<number>;
}

function mapProviderKey(key: {
  id: string;
  provider: string;
  label?: string | null;
  keyHint: string;
  createdAt: string;
  updatedAt: string;
}): ProviderKey {
  return {
    id: key.id,
    provider: key.provider,
    label: key.label ?? key.provider,
    keyHint: key.keyHint,
    status: "connected",
    addedAt: key.createdAt,
    lastUsed: key.updatedAt,
  };
}

export const modelService: ModelHubService = {
  async listModels() {
    return MODELS;
  },

  async getModel(id) {
    return MODEL_BY_ID[id] ?? null;
  },

  async listProviderKeys() {
    const headers = await getServerCookieHeader();
    const res = await apiFetch("/api/provider-keys", { ...(headers.Cookie ? { headers } : {}) }, listProviderKeysResponseSchema);
    return res.keys.filter((k) => !k.revokedAt).map(mapProviderKey);
  },

  async createProviderKey(input) {
    const headers = await getServerCookieHeader();
    const res = await apiFetch(
      "/api/provider-keys",
      {
        method: "POST",
        body: input,
        ...(headers.Cookie ? { headers } : {}),
      },
      createProviderKeyResponseSchema,
    );
    return mapProviderKey(res.key);
  },

  async revokeProviderKey(id) {
    const headers = await getServerCookieHeader();
    await apiFetch(
      `/api/provider-keys/${id}`,
      { method: "DELETE", ...(headers.Cookie ? { headers } : {}) },
      deleteProviderKeyResponseSchema,
    );
  },

  async estimateCost(modelId, tokensIn, tokensOut) {
    return estimateCost(modelId, tokensIn, tokensOut);
  },
};
