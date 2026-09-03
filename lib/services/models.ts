import {
  createApiKeyResponseSchema,
  createProviderKeyResponseSchema,
  deleteApiKeyResponseSchema,
  deleteProviderKeyResponseSchema,
  listApiKeysResponseSchema,
  listProviderKeysResponseSchema,
  listModelCatalogResponseSchema,
} from "@layerflow/contracts";
import { apiFetch, getServerCookieHeader } from "@/lib/api/client";
import type { ModelInfo, PlatformKey, ProviderKey } from "@/lib/types";

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
  listPlatformKeys(): Promise<PlatformKey[]>;
  createPlatformKey(name: string): Promise<{ key: PlatformKey; secret: string }>;
  revokePlatformKey(id: string): Promise<void>;
  estimateCost(modelId: string, tokensIn: number, tokensOut: number): Promise<number>;
}

function mapPlatformKey(key: {
  id: string;
  name: string;
  keyPrefix: string;
  projectId?: string | null;
  createdAt: string;
  lastUsedAt?: string | null;
}): PlatformKey {
  return {
    id: key.id,
    name: key.name,
    prefix: key.keyPrefix,
    projectId: key.projectId ?? undefined,
    createdAt: key.createdAt,
    lastUsed: key.lastUsedAt ?? undefined,
  };
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

function toModelInfo(entry: {
  id: string;
  provider: string;
  displayName: string;
  inputPricePerMTokMicro: number;
  outputPricePerMTokMicro: number;
  contextWindow: number;
  maxOutputTokens?: number | null;
  available: boolean;
}): ModelInfo {
  const classForPrice = (micro: number): ModelInfo["class"] => {
    if (micro <= 300_000) return "cheap";
    if (micro <= 800_000) return "balanced";
    return "flagship";
  };
  return {
    id: entry.id,
    provider: entry.provider,
    name: entry.displayName,
    class: classForPrice(entry.inputPricePerMTokMicro),
    quality: entry.id.includes("flash") || entry.id.includes("mini") ? 84 : 90,
    costIn: entry.inputPricePerMTokMicro / 1_000_000,
    costOut: entry.outputPricePerMTokMicro / 1_000_000,
    speed: 5,
    bestFor: "General chat and analysis",
    supportsByok: true,
  };
}

export const modelService: ModelHubService = {
  async listModels() {
    const headers = await getServerCookieHeader();
    try {
      const res = await apiFetch(
        "/api/models",
        { ...(headers.Cookie ? { headers } : {}) },
        listModelCatalogResponseSchema,
      );
      return res.models.map(toModelInfo);
    } catch {
      // Fall back to static catalog when API is unreachable
      const { MODELS } = await import("@/lib/data/providers");
      return MODELS;
    }
  },

  async getModel(id) {
    const models = await this.listModels();
    return models.find((m) => m.id === id) ?? null;
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

  async listPlatformKeys() {
    const headers = await getServerCookieHeader();
    const res = await apiFetch("/api/keys", { ...(headers.Cookie ? { headers } : {}) }, listApiKeysResponseSchema);
    return res.keys.filter((k) => !k.revokedAt).map(mapPlatformKey);
  },

  async createPlatformKey(name) {
    const headers = await getServerCookieHeader();
    const res = await apiFetch(
      "/api/keys",
      {
        method: "POST",
        body: { name },
        ...(headers.Cookie ? { headers } : {}),
      },
      createApiKeyResponseSchema,
    );
    return { key: mapPlatformKey(res.key), secret: res.secret };
  },

  async revokePlatformKey(id) {
    const headers = await getServerCookieHeader();
    await apiFetch(
      `/api/keys/${id}`,
      { method: "DELETE", ...(headers.Cookie ? { headers } : {}) },
      deleteApiKeyResponseSchema,
    );
  },

  async estimateCost(modelId, tokensIn, tokensOut) {
    const { estimateCost } = await import("@/lib/data/providers");
    return estimateCost(modelId, tokensIn, tokensOut);
  },
};
