import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { MODELS, type Provider } from "@layerflow/model-registry";
import {
  listModelCatalogResponseSchema,
  type ListModelCatalogResponse,
  type ModelCatalogEntry,
} from "@layerflow/contracts";
import { db } from "../../db/client";
import { providerKeys } from "../../db/schema/gateway";
import { requireAuth } from "../../middleware/auth";
import { platformApiKey } from "../../services/ai/providers";
import { canUseManagedProvider } from "../../middleware/plan-limits";
import type { AppEnv } from "../../types";

/**
 * /api/models — live model catalog from the registry, filtered by
 * which providers are available for the current workspace.
 *
 * A model is "available" when the workspace has a usable key for its
 * provider (BYOK or platform), and its plan allows the provider.
 */
export const modelsRouter = new Hono<AppEnv>();

modelsRouter.use(requireAuth);

function toModelCatalogEntry(m: (typeof MODELS)[number], available: boolean): ModelCatalogEntry {
  return {
    id: m.id,
    provider: m.provider,
    displayName: m.displayName,
    inputPricePerMTokMicro: m.inputPricePerMTokMicro,
    outputPricePerMTokMicro: m.outputPricePerMTokMicro,
    cachedInputPricePerMTokMicro: m.cachedInputPricePerMTokMicro,
    contextWindow: m.contextWindow,
    maxOutputTokens: m.maxOutputTokens,
    capabilities: {
      streaming: m.capabilities.streaming,
      toolCalling: m.capabilities.toolCalling,
      vision: m.capabilities.vision,
      reasoning: m.capabilities.reasoning,
    },
    available,
  };
}

async function providerIsAvailable(workspaceId: string, provider: string): Promise<boolean> {
  // BYOK key exists and is not revoked
  const byok = await db.query.providerKeys.findFirst({
    where: (k, { and, eq, isNull }) =>
      and(
        eq(k.workspaceId, workspaceId),
        eq(k.provider, provider),
        isNull(k.revokedAt),
      ),
  });
  if (byok) return true;

  // Platform key configured in environment and plan allows it
  const envKey = platformApiKey(provider as Provider);
  if (envKey) {
    const access = await canUseManagedProvider(workspaceId, provider, false);
    return access.allowed;
  }

  return false;
}

// GET /api/models — return all registry models with live availability
modelsRouter.get("/", async (c) => {
  const workspaceId = c.get("workspaceId");

  // Resolve availability for all providers in one pass
  const seen = new Set<string>();
  const availability = new Map<string, boolean>();

  for (const m of MODELS) {
    if (!seen.has(m.provider)) {
      seen.add(m.provider);
      availability.set(m.provider, await providerIsAvailable(workspaceId, m.provider));
    }
  }

  const models: ModelCatalogEntry[] = MODELS.map((m) =>
    toModelCatalogEntry(m, availability.get(m.provider) ?? false),
  );

  const response: ListModelCatalogResponse = { models };
  return c.json(response);
});