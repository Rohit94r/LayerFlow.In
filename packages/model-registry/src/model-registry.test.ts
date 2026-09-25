import { describe, expect, it } from "vitest";
import {
  MODELS,
  PROVIDERS,
  computeCostMicro,
  getModelPricing,
  getModelsForProvider,
  resolveProvider,
} from "./index";

/**
 * Price-accuracy gate (Phase 3 workstream: "cost computed from the registry").
 *
 * All prices are micro-dollars per 1M tokens ($1 = 1_000_000). The spend
 * firewall charges against computeCostMicro, so a wrong catalog number shows
 * up in every bill. These tests pin:
 *   - catalog invariants (unique ids, sane prices, providers populated)
 *   - exact micro-dollar math (integer micro-dollars per call, never under-paid)
 *   - dollar anchors against published pricing, to 4 decimals of USD
 *   - provider resolution round-trips for the whole catalog
 */
describe("model registry price accuracy", () => {
  it("catalog invariants hold: unique ids, valid prices, populated providers", () => {
    const ids = new Set(MODELS.map((m) => m.id));
    expect(ids.size).toBe(MODELS.length);

    for (const model of MODELS) {
      expect(model.inputPricePerMTokMicro).toBeGreaterThanOrEqual(0);
      expect(model.outputPricePerMTokMicro).toBeGreaterThanOrEqual(0);
      expect(model.contextWindow).toBeGreaterThan(0);
      // Micro-dollars per 1k tokens stays an integer → no rounding loss at
      // the per-request scale we bill.
      expect(Number.isInteger(model.inputPricePerMTokMicro / 1000)).toBe(true);
      expect(Number.isInteger(model.outputPricePerMTokMicro / 1000)).toBe(true);
    }

    for (const provider of PROVIDERS) {
      expect(getModelsForProvider(provider).length).toBeGreaterThan(0);
    }
  });

  it("computeCostMicro returns exact integer micro-dollars and never under-charges", () => {
    // gpt-4o: $2.50 in / $10.00 out per 1M tokens.
    expect(computeCostMicro("gpt-4o", 1_000_000, 0)).toBe(2_500_000);
    expect(computeCostMicro("gpt-4o", 0, 1_000_000)).toBe(10_000_000);
    expect(computeCostMicro("gpt-4o", 1_000_000, 1_000_000)).toBe(12_500_000);

    // gpt-4o-mini: $0.15 in / $0.60 out per 1M tokens.
    expect(computeCostMicro("gpt-4o-mini", 1_000, 0)).toBe(150);
    expect(computeCostMicro("gpt-4o-mini", 0, 1_000)).toBe(600);
    expect(computeCostMicro("gpt-4o-mini", 1, 1)).toBe(1); // ceil(0.75) → never free

    for (const model of MODELS) {
      for (const [input, output] of [
        [0, 0],
        [1, 1],
        [137, 911],
        [10_000, 100],
      ] as const) {
        const cost = computeCostMicro(model.id, input, output);
        expect(cost).not.toBeUndefined();
        const exact =
          (input * model.inputPricePerMTokMicro + output * model.outputPricePerMTokMicro) /
          1_000_000;
        expect(cost).toBe(Math.ceil(exact));
        expect(cost).toBeGreaterThanOrEqual(exact); // never under-charge
      }
    }
  });

  it("registry prices match published USD anchors to 4 decimals", () => {
    const anchorUsd: Record<string, { inUsd: number; outUsd: number }> = {
      "gpt-4o": { inUsd: 2.5, outUsd: 10 }, // $2.50 / $10 per 1M
      "gpt-4o-mini": { inUsd: 0.15, outUsd: 0.6 },
      "claude-sonnet-4": { inUsd: 3, outUsd: 15 },
    };
    for (const [id, { inUsd, outUsd }] of Object.entries(anchorUsd)) {
      const pricing = getModelPricing(id);
      expect(pricing, `${id} present`).toBeTruthy();
      // micro per 1M → USD per 1M, to 4 decimals.
      expect((pricing!.inputPricePerMTokMicro / 1_000_000).toFixed(4)).toBe(inUsd.toFixed(4));
      expect((pricing!.outputPricePerMTokMicro / 1_000_000).toFixed(4)).toBe(outUsd.toFixed(4));
    }
  });

  it("resolveProvider round-trips every catalog model", () => {
    for (const model of MODELS) {
      expect(resolveProvider(model.id)).toBe(model.provider);
    }
    // Prefix fallbacks still resolve for known families.
    expect(resolveProvider("gpt-5")).toBe("openai");
    expect(resolveProvider("claude-sonnet-4-5")).toBe("anthropic");
    expect(resolveProvider("gemini-3-pro")).toBe("google");
    expect(resolveProvider("vendor/model")).toBe("openrouter");
    expect(resolveProvider("totally-unknown-xyz")).toBeUndefined();
  });
});