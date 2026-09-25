import { z } from "zod";
import { idSchema, timestampSchema } from "./common";

/** LayerFlow gateway API key (secret shown only once at creation). */
export const apiKeySchema = z.object({
  id: idSchema,
  workspaceId: idSchema,
  name: z.string(),
  keyPrefix: z.string(),
  projectId: idSchema.nullish(),
  dailyRequestCap: z.number().int().positive().nullish(),
  lastUsedAt: timestampSchema.nullish(),
  revokedAt: timestampSchema.nullish(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export type ApiKey = z.infer<typeof apiKeySchema>;

/** POST /api/keys */
export const createApiKeyRequestSchema = z.object({
  name: z.string().min(1).max(120),
  projectId: idSchema.optional(),
  dailyRequestCap: z.number().int().positive().optional(),
});

export type CreateApiKeyRequest = z.infer<typeof createApiKeyRequestSchema>;

export const createApiKeyResponseSchema = z.object({
  key: apiKeySchema,
  /** Full secret — shown once; never returned again. */
  secret: z.string(),
});

export type CreateApiKeyResponse = z.infer<typeof createApiKeyResponseSchema>;

export const listApiKeysResponseSchema = z.object({
  keys: z.array(apiKeySchema),
});

export type ListApiKeysResponse = z.infer<typeof listApiKeysResponseSchema>;

export const deleteApiKeyResponseSchema = z.object({
  id: idSchema,
  revoked: z.literal(true),
});

export type DeleteApiKeyResponse = z.infer<typeof deleteApiKeyResponseSchema>;

/** BYOK provider key — never includes ciphertext or full secret. */
export const providerKeySchema = z.object({
  id: idSchema,
  workspaceId: idSchema,
  provider: z.string(),
  keyHint: z.string(),
  label: z.string().nullish(),
  /** Custom OpenAI-compatible base URL override (vault-backed BYOK). */
  baseUrl: z.string().nullish(),
  revokedAt: timestampSchema.nullish(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export type ProviderKey = z.infer<typeof providerKeySchema>;

/** POST /api/provider-keys */
export const createProviderKeyRequestSchema = z.object({
  provider: z
    .string()
    .min(1)
    .max(40)
    .regex(/^[a-z][a-z0-9_-]*$/i),
  secret: z.string().min(8).max(512),
  label: z.string().max(120).optional(),
  /**
   * Optional base URL override for OpenAI-compatible providers. The server
   * enforces HTTPS (in production) and rejects private/loopback/link-local
   * hosts to keep the vault path SSRF-safe.
   */
  baseUrl: z.string().url().max(300).optional(),
});

export type CreateProviderKeyRequest = z.infer<typeof createProviderKeyRequestSchema>;

export const createProviderKeyResponseSchema = z.object({
  key: providerKeySchema,
});

export type CreateProviderKeyResponse = z.infer<typeof createProviderKeyResponseSchema>;

export const listProviderKeysResponseSchema = z.object({
  keys: z.array(providerKeySchema),
});

export type ListProviderKeysResponse = z.infer<typeof listProviderKeysResponseSchema>;

export const deleteProviderKeyResponseSchema = z.object({
  id: idSchema,
  revoked: z.literal(true),
});

export type DeleteProviderKeyResponse = z.infer<typeof deleteProviderKeyResponseSchema>;
