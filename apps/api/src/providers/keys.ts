import { and, eq, isNull } from "drizzle-orm";
import type { Provider } from "@layerflow/model-registry";
import { db } from "../db/client";
import { getEnv } from "../config/env";
import { providerKeys } from "../db/schema/gateway";
import { AppError } from "../middleware/error";
import { decryptSecret } from "../services/crypto";

/**
 * Platform-level provider keys read from the environment. Used only as a
 * fallback when a workspace has not added its own BYOK key, so the product
 * works out of the box for providers the operator has configured.
 */
function platformProviderKey(provider: Provider): string | undefined {
  const env = getEnv();
  switch (provider) {
    case "openai":
      return env.OPENAI_API_KEY;
    case "groq":
      return env.GROQ_API_KEY;
    case "google":
      return env.GEMINI_API_KEY;
    default:
      return undefined;
  }
}

/**
 * Optional platform default model for a provider (GROQ_MODEL / GEMINI_MODEL).
 * Purely a serving-side default for "works out of the box" flows; callers
 * must fall back to their own defaults when unset.
 */
export function platformDefaultModel(provider: Provider): string | undefined {
  const env = getEnv();
  switch (provider) {
    case "groq":
      return env.GROQ_MODEL;
    case "google":
      return env.GEMINI_MODEL;
    default:
      return undefined;
  }
}

/**
 * Load and decrypt the API key for a provider. Prefers the workspace's own
 * BYOK key; otherwise falls back to a platform key from the environment.
 * Throws 400 `provider_key_missing` when neither is configured.
 */
export async function loadProviderApiKey(
  workspaceId: string,
  provider: Provider,
): Promise<string> {
  const row = await db.query.providerKeys.findFirst({
    where: and(
      eq(providerKeys.workspaceId, workspaceId),
      eq(providerKeys.provider, provider),
      isNull(providerKeys.revokedAt),
    ),
  });

  if (row) {
    try {
      return decryptSecret(row.ciphertext);
    } catch {
      throw new AppError(500, "provider_key_corrupt", `Failed to decrypt ${provider} API key`);
    }
  }

  const platformKey = platformProviderKey(provider);
  if (platformKey) {
    return platformKey;
  }

  throw new AppError(
    400,
    "provider_key_missing",
    `No ${provider} API key configured for this workspace. Add one under Settings → Provider keys.`,
  );
}
