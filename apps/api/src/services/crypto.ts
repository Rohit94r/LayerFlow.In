import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { getEnv } from "../config/env";

/**
 * Crypto helpers for secrets at rest.
 *
 * - BYOK provider keys: AES-256-GCM, keyed by PROVIDER_KEYS_KEK.
 * - LayerFlow API keys: HMAC-SHA256 hash (we never store the raw key).
 */

const IV_LENGTH = 12; // GCM standard nonce size
const AUTH_TAG_LENGTH = 16;

function kek(): Buffer {
  return Buffer.from(getEnv().PROVIDER_KEYS_KEK, "hex");
}

/**
 * Encrypt a secret. Output format (base64): iv || authTag || ciphertext.
 * A fresh random IV per call means encrypting the same value twice yields
 * different ciphertexts.
 */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", kek(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]).toString("base64");
}

/** Decrypt a value produced by encryptSecret. Throws if tampered or wrong key. */
export function decryptSecret(encoded: string): string {
  const raw = Buffer.from(encoded, "base64");
  const iv = raw.subarray(0, IV_LENGTH);
  const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = raw.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = createDecipheriv("aes-256-gcm", kek(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

/** Deterministic HMAC-SHA256 hash of an API key, hex-encoded. Store this, not the key. */
export function hashApiKey(apiKey: string): string {
  return createHmac("sha256", kek()).update(apiKey).digest("hex");
}

/** Constant-time comparison of a presented API key against a stored hash. */
export function verifyApiKey(apiKey: string, storedHash: string): boolean {
  const presented = Buffer.from(hashApiKey(apiKey), "hex");
  const stored = Buffer.from(storedHash, "hex");
  return presented.length === stored.length && timingSafeEqual(presented, stored);
}

/** Generate a new gateway key: full secret + display prefix. Show secret once. */
export function generateApiKey(): { secret: string; prefix: string } {
  const secret = `lf_live_${randomBytes(24).toString("base64url")}`;
  return { secret, prefix: secret.slice(0, 12) };
}
