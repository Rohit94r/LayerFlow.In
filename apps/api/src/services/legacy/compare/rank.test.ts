import { describe, expect, it } from "vitest";
import { computeRankHints } from "./rank";

describe("computeRankHints", () => {
  it("marks cheapest, fastest, and best among succeeded runs", () => {
    const hints = computeRankHints([
      { runId: "a", status: "succeeded", costMicro: 100, latencyMs: 50, outputLength: 10 },
      { runId: "b", status: "succeeded", costMicro: 50, latencyMs: 200, outputLength: 100 },
      { runId: "c", status: "failed", costMicro: 0, latencyMs: 10, outputLength: 0 },
    ]);
    expect(hints.get("b")!.cheapest).toBe(true);
    expect(hints.get("a")!.fastest).toBe(true);
    expect(hints.get("b")!.best).toBe(true);
    expect(hints.get("c")!.best).toBe(false);
    expect(hints.get("c")!.cheapest).toBe(false);
  });

  it("returns empty badges when nothing succeeded", () => {
    const hints = computeRankHints([
      { runId: "x", status: "failed", costMicro: 0, latencyMs: null, outputLength: 0 },
    ]);
    expect(hints.get("x")).toEqual({ best: false, cheapest: false, fastest: false });
  });
});
