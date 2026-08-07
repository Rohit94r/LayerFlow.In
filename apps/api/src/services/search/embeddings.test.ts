import { describe, expect, it } from "vitest";
import { EMBEDDING_DIMENSIONS, LOCAL_EMBEDDING_MODEL, localEmbed } from "./embeddings";

describe("localEmbed", () => {
  it("returns a 1536-dim L2-normalized vector", () => {
    const v = localEmbed("budget meter UI progress bar");
    expect(v).toHaveLength(EMBEDDING_DIMENSIONS);
    const norm = Math.sqrt(v.reduce((sum, x) => sum + x * x, 0));
    expect(norm).toBeCloseTo(1, 5);
  });

  it("is deterministic", () => {
    expect(localEmbed("hello world")).toEqual(localEmbed("hello world"));
  });

  it("gives higher cosine similarity to related texts than unrelated ones", () => {
    const a = localEmbed("monthly budget meter for AI spend");
    const b = localEmbed("budget bar showing AI spend");
    const c = localEmbed("resume bullet rewriter with metrics");

    const cosine = (x: number[], y: number[]) =>
      x.reduce((sum, xi, i) => sum + xi * y[i], 0);

    expect(cosine(a, b)).toBeGreaterThan(cosine(a, c));
  });

  it("exports the model name beginners see in API responses", () => {
    expect(LOCAL_EMBEDDING_MODEL).toBe("local-hash-v1");
  });
});
