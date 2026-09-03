import { z } from "zod";

/**
 * Model catalog contracts.
 * The registry @layerflow/model-registry is the single source of truth;
 * this endpoint exposes it filtered by live provider availability.
 * Uses Catalog* prefix to avoid collision with gateway's OpenAI-compatible model list.
 */

export const modelCatalogCapabilitiesSchema = z.object({
  streaming: z.boolean(),
  toolCalling: z.boolean(),
  vision: z.boolean(),
  reasoning: z.boolean(),
});

export type ModelCatalogCapabilities = z.infer<typeof modelCatalogCapabilitiesSchema>;

export const modelCatalogEntrySchema = z.object({
  id: z.string(),
  provider: z.string(),
  displayName: z.string(),
  inputPricePerMTokMicro: z.number().int().nonnegative(),
  outputPricePerMTokMicro: z.number().int().nonnegative(),
  cachedInputPricePerMTokMicro: z.number().int().nonnegative().optional(),
  contextWindow: z.number().int().nonnegative(),
  maxOutputTokens: z.number().int().nonnegative().optional(),
  capabilities: modelCatalogCapabilitiesSchema,
  /** Whether this model is available for the current workspace. */
  available: z.boolean(),
});

export type ModelCatalogEntry = z.infer<typeof modelCatalogEntrySchema>;

export const listModelCatalogResponseSchema = z.object({
  models: z.array(modelCatalogEntrySchema),
});

export type ListModelCatalogResponse = z.infer<typeof listModelCatalogResponseSchema>;