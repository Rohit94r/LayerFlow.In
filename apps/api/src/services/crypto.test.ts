import { describe, expect, it } from "vitest";
import {
  decryptSecret,
  encryptSecret,
  generateApiKey,
  hashApiKey,
  verifyApiKey,
} from "./crypto";

describe("encryptSecret / decryptSecret", () => {
  it("round-trips a provider key", () => {
    const plaintext = "sk-proj-abc123-very-secret";
    expect(decryptSecret(encryptSecret(plaintext))).toBe(plaintext);
  });

  it("produces different ciphertexts for the same input (random IV)", () => {
    expect(encryptSecret("same")).not.toBe(encryptSecret("same"));
  });

  it("handles unicode", () => {
    const plaintext = "clé-secrète-日本語-🔑";
    expect(decryptSecret(encryptSecret(plaintext))).toBe(plaintext);
  });

  it("throws on tampered ciphertext", () => {
    const encoded = encryptSecret("secret");
    const raw = Buffer.from(encoded, "base64");
    raw[raw.length - 1] ^= 0xff; // flip a ciphertext bit
    expect(() => decryptSecret(raw.toString("base64"))).toThrow();
  });
});

describe("hashApiKey / verifyApiKey", () => {
  it("is deterministic", () => {
    expect(hashApiKey("lf_live_abc")).toBe(hashApiKey("lf_live_abc"));
  });

  it("verifies a matching key and rejects a different one", () => {
    const hash = hashApiKey("lf_live_abc");
    expect(verifyApiKey("lf_live_abc", hash)).toBe(true);
    expect(verifyApiKey("lf_live_xyz", hash)).toBe(false);
  });

  it("outputs 64 hex chars (SHA-256)", () => {
    expect(hashApiKey("anything")).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("generateApiKey", () => {
  it("generates unique lf_live_ keys with a display prefix", () => {
    const a = generateApiKey();
    const b = generateApiKey();
    expect(a.secret).toMatch(/^lf_live_/);
    expect(a.secret).not.toBe(b.secret);
    expect(a.prefix).toBe(a.secret.slice(0, 12));
  });
});
