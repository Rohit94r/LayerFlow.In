import { and, eq, isNull } from "drizzle-orm";
import { isIP } from "node:net";
import type { CreateProviderKeyRequest, ProviderKey } from "@layerflow/contracts";
import { PROVIDERS, type Provider } from "@layerflow/model-registry";
import { db } from "../../db/client";
import { providerKeys } from "../../db/schema/gateway";
import { AppError } from "../../middleware/app-error";
import { canUseManagedProvider } from "../../middleware/plan-limits";
import { platformApiKey } from "../ai/providers";
import { writeAuditLog } from "../audit/log";
import { decryptSecret, encryptSecret } from "../crypto";

function toProviderKeyDto(row: typeof providerKeys.$inferSelect): ProviderKey {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    provider: row.provider,
    keyHint: row.keyHint,
    label: row.label,
    baseUrl: row.baseUrl ?? null,
    revokedAt: row.revokedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function hintFromSecret(secret: string): string {
  const trimmed = secret.trim();
  return trimmed.slice(-4);
}

const RESERVED_HOST_SUFFIXES = [
  "localhost",
  ".localhost",
  ".local",
  ".internal",
  ".lan",
  ".home.arpa",
];

function isPrivateHost(host: string): boolean {
  const normalized = host.toLowerCase().replace(/\.$/, "");
  if (normalized === "::1") return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true; // fc00::/7
  if (normalized.startsWith("fe80")) return true; // fe80::/10 link-local
  if (isIP(normalized) === 4) {
    const [a, b] = normalized.split(".").map(Number);
    return (
      a === 0 || // 0.0.0.0/8
      a === 10 || // 10.0.0.0/8
      a === 127 || // loopback
      (a === 100 && b >= 64 && b <= 127) || // 100.64.0.0/10 CGNAT
      (a === 169 && b === 254) || // 169.254.0.0/16 link-local / cloud metadata
      (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12
      (a === 192 && b === 168) // 192.168.0.0/16
    );
  }
  return RESERVED_HOST_SUFFIXES.some((suffix) => normalized === suffix || normalized.endsWith(suffix));
}

function assertSafeBaseUrl(raw: string | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new AppError(400, "invalid_base_url", "baseUrl must be a valid http(s) URL");
  }
  if (url.username || url.password) {
    throw new AppError(400, "invalid_base_url", "baseUrl must not contain credentials");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new AppError(400, "invalid_base_url", "baseUrl must be http(s)");
  }
  if (process.env.NODE_ENV === "production" && url.protocol === "http:") {
    throw new AppError(400, "invalid_base_url", "baseUrl must use https in production");
  }
  if (isPrivateHost(url.hostname)) {
    throw new AppError(
      400,
      "base_url_forbidden",
      "Custom base URLs to private, loopback, or link-local hosts are not allowed",
    );
  }
  return trimmed.replace(/\/+$/, "");
}

export async function createProviderKey(
  workspaceId: string,
  body: CreateProviderKeyRequest,
): Promise<ProviderKey> {
  const provider = body.provider.toLowerCase();
  const ciphertext = encryptSecret(body.secret.trim());
  const baseUrl = assertSafeBaseUrl(body.baseUrl);
  const [row] = await db
    .insert(providerKeys)
    .values({
      workspaceId,
      provider,
      ciphertext,
      keyHint: hintFromSecret(body.secret),
      label: body.label ?? null,
      baseUrl,
    })
    .returning();

  void writeAuditLog({
    workspaceId,
    actorType: "api",
    action: "provider_key.created",
    detail: { provider, keyHint: hintFromSecret(body.secret) },
  });
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

  void writeAuditLog({
    workspaceId,
    actorType: "api",
    action: "provider_key.revoked",
    detail: { provider: row.provider, keyHint: row.keyHint, keyId: row.id },
  });
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

  void writeAuditLog({
    workspaceId,
    actorType: "api",
    action: "provider_key.decrypted",
    detail: { provider, keyHint: row.keyHint, keyId: row.id },
  });
  return decryptSecret(row.ciphertext);
}

/**
 * Rotate the vault: re-encrypt every non-revoked provider key under a new KEK
 * (plaintext stays in memory only; never touches the DB or logs). Audit one
 * system event for the rotation. The operator swaps PROVIDER_KEYS_KEK to the
 * new value after this returns — until then, rows are under the NEW key, so
 * swap env + re-deploy immediately after.
 */
export async function rotateProviderKeys(
  newKekHex: string,
): Promise<{ rotated: number; failed: number }> {
  if (!/^[0-9a-fA-F]{64}$/.test(newKekHex)) {
    throw new AppError(400, "invalid_kek", "newKekHex must be 64 hex chars (use `openssl rand -hex 32`)");
  }
  const rows = await db.query.providerKeys.findMany({
    where: (k, { isNull }) => isNull(k.revokedAt),
  });

  let rotated = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      const plaintext = decryptSecret(row.ciphertext);
      await db
        .update(providerKeys)
        .set({ ciphertext: encryptSecret(plaintext, newKekHex) })
        .where(eq(providerKeys.id, row.id));
      rotated += 1;
    } catch {
      failed += 1;
    }
  }

  await writeAuditLog({
    actorType: "system",
    action: "provider_keys.vault_rotated",
    detail: { rotated, failed },
  });
  return { rotated, failed };
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
