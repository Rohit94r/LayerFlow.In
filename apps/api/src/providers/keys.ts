import { and, eq, isNull } from "drizzle-orm";
import type { Provider } from "@layerflow/model-registry";
import { db } from "../db/client";
import { providerKeys } from "../db/schema/gateway";
import { AppError } from "../middleware/error";
import { decryptSecret } from "../services/crypto";

/**
 * Load and decrypt the workspace's BYOK key for a provider.
 * Returns 400 `provider_key_missing` when none is configured.
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

  if (!row) {
    throw new AppError(
      400,
      "provider_key_missing",
      `No ${provider} API key configured for this workspace. Add one under Settings → Provider keys.`,
    );
  }

  try {
    return decryptSecret(row.ciphertext);
  } catch {
    throw new AppError(500, "provider_key_corrupt", `Failed to decrypt ${provider} API key`);
  }
}
