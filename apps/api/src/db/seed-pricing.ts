import { MODELS } from "@layerflow/model-registry";
import { db } from "./client";
import { modelPricing } from "./schema/intelligence";

/**
 * Seed model_pricing from @layerflow/model-registry when the table is empty.
 * Idempotent: skips if any rows already exist (effective-dated overrides win).
 *
 * Used only by the local/demo `db:seed` script. Runtime cost estimates use
 * `@layerflow/model-registry` directly — an empty `model_pricing` table is fine
 * in production (the table is for optional effective-dated overrides).
 */
export async function seedModelPricingIfEmpty(): Promise<number> {
  const existing = await db.query.modelPricing.findFirst();
  if (existing) return 0;

  const effectiveFrom = new Date("2026-01-01T00:00:00.000Z");
  await db.insert(modelPricing).values(
    MODELS.map((m) => ({
      provider: m.provider,
      model: m.id,
      effectiveFrom,
      inputPricePerMTokMicro: m.inputPricePerMTokMicro,
      outputPricePerMTokMicro: m.outputPricePerMTokMicro,
      cachedInputPricePerMTokMicro: m.cachedInputPricePerMTokMicro ?? null,
      contextWindow: m.contextWindow,
      capabilities: m.capabilities,
    })),
  );
  return MODELS.length;
}
