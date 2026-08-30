import { and, eq, isNull } from "drizzle-orm";
import type { CreateProviderKeyRequest, ProviderKey } from "@layerflow/contracts";
import { PROVIDERS, type Provider } from "@layerflow/model-registry";
import { db } from "../../db/client";
import { providerKeys } from "../../db/schema/gateway";
import { AppError } from "../../middleware/app-error";
import { canUseManagedProvider } from "../../middleware/plan-limits";
import { platformApiKey } from "../ai/providers";
import { decryptSecret, encryptSecret } from "../crypto";

function toProviderKeyDto(row: typeof providerKeys.$inferSelect): ProviderKey {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    provider: row.provider,
    keyHint: row.keyHint,
    label: row.label,
    revokedAt: row.revokedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function hintFromSecret(secret: string): string {
  const trimmed = secret.trim();
  return trimmed.slice(-4);
}

export async function createProviderKey(
  workspaceId: string,
  body: CreateProviderKeyRequest,
): Promise<ProviderKey> {
  const provider = body.provider.toLowerCase();
  const ciphertext = encryptSecret(body.secret.trim());
  const [row] = await db
    .insert(providerKeys)
    .values({
      workspaceId,
      provider,
      ciphertext,
      keyHint: hintFromSecret(body.secret),
      label: body.label ?? null,
    })
    .returning();
  return toProviderKeyDto(row);
}

export async function listProviderKeys(workspaceId: string): Promise<ProviderKey[]> {
  const rows = await db.query.providerKeys.findMany({
    where: (k, { and, eq, isNull }) => and(eq(k.workspaceId, workspaceId), isNull(k.revokedAt)),
    orderBy: (k, { desc }) => [desc(k.createdAt)],
  });
  return rows.map(toProviderKeyDto);
}

export async function revokeProviderKey(workspaceId: string, id: string): Promise<ProviderKey> {
  const [row] = await db
    .update(providerKeys)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(providerKeys.id, id),
        eq(providerKeys.workspaceId, workspaceId),
        isNull(providerKeys.revokedAt),
      ),
    )
    .returning();
  if (!row) throw new AppError(404, "not_found", "Provider key not found");
  return toProviderKeyDto(row);
}

/** Decrypt the newest non-revoked BYOK key for a provider. Plaintext is ephemeral. */
export async function loadProviderSecret(
  workspaceId: string,
  provider: string,
): Promise<string | null> {
  const row = await db.query.providerKeys.findFirst({
    where: (k, { and, eq, isNull }) =>
      and(eq(k.workspaceId, workspaceId), eq(k.provider, provider), isNull(k.revokedAt)),
    orderBy: (k, { desc }) => [desc(k.createdAt)],
  });
  if (!row) return null;
  return decryptSecret(row.ciphertext);
}

/**
 * Providers this workspace can actually use right now: its own BYOK keys
 * (always usable, never plan-gated) plus any platform providers configured
 * in the environment whose managed use the workspace's plan allows. This
 * powers the `available` flag on `GET /v1/models` so a brand-new free user
 * with no BYOK still sees the free platform providers (Groq/Gemini) as
 * available and can chat immediately — the "free first month" path. In beta
 * mode (billing not configured) every platform key is allowed.
 */
export async function listConfiguredProviders(workspaceId: string): Promise<string[]> {
  const rows = await listProviderKeys(workspaceId);
  const byok = new Set(rows.map((r) => r.provider));

  for (const provider of PROVIDERS as readonly Provider[]) {
    if (byok.has(provider)) continue;
    if (!platformApiKey(provider)) continue;
    const access = await canUseManagedProvider(workspaceId, provider, false);
    if (access.allowed) byok.add(provider);
  }
  return [...byok];
}
