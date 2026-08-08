import { and, eq, isNull } from "drizzle-orm";
import { PROVIDERS, type Provider } from "@layerflow/model-registry";
import type { ChatKeyHealth } from "@layerflow/contracts";
import { db } from "../../db/client";
import { providerKeys } from "../../db/schema/gateway";
import { providerKeyHealth, type ProviderKeyHealthRow } from "../../db/schema/chat";
import { platformApiKey } from "../ai/providers";

export type KeyStatus = "healthy" | "degrading" | "dead" | "expired";

export interface KeyHealthIdentity {
  workspaceId: string;
  provider: string;
  /** null for platform env keys. */
  keyId: string | null;
  /** Unique-per-key label — last 4 chars for BYOK, "platform:<provider>" for env keys. */
  keyHint: string;
}

/** Record a successful provider call → key returns to healthy, failures reset. */
export async function markKeyHealthy(id: KeyHealthIdentity): Promise<void> {
  await db
    .insert(providerKeyHealth)
    .values({
      workspaceId: id.workspaceId,
      provider: id.provider,
      keyId: id.keyId,
      keyHint: id.keyHint,
      status: "healthy",
      consecutiveFailures: 0,
      lastStatusCode: null,
      lastErrorCode: null,
      lastErrorAt: null,
      cooldownUntil: null,
    })
    .onConflictDoUpdate({
      target: [
        providerKeyHealth.workspaceId,
        providerKeyHealth.provider,
        providerKeyHealth.keyHint,
      ],
      set: {
        keyId: id.keyId,
        status: "healthy",
        consecutiveFailures: 0,
        lastStatusCode: null,
        lastErrorCode: null,
        lastErrorAt: null,
        cooldownUntil: null,
      },
    });
}

/**
 * Record a provider-call failure and derive the key status:
 *   401/403  → dead     (invalid / revoked key)
 *   402      → expired  (quota exceeded)
 *   429      → degrading + short cooldown (rate limited)
 *   other    → degrading (provider outage, not the key)
 *
 * Billing/quota wording in the error body (no credits, insufficient balance,
 * quota exceeded, suspended) upgrades any status to `expired` — the key is
 * fine but the account is out of money, so it should not be retried on the
 * next message (failover skips it until the account is topped up).
 */
export async function markKeyFailed(
  id: KeyHealthIdentity,
  input: { statusCode: number; code?: string; errorMessage?: string; cooldownSeconds?: number },
): Promise<void> {
  const billingLike = /no credits|insufficient balance|insufficient_quota|quota exceeded|billing|suspended|payment required/i;
  const isBilling = Boolean(
    (input.code ?? "").match(billingLike) ||
      (input.errorMessage ?? "").match(billingLike),
  );
  let status: KeyStatus =
    input.statusCode === 401 || input.statusCode === 403
      ? "dead"
      : input.statusCode === 402
        ? "expired"
        : "degrading";

  if (status !== "dead" && isBilling) status = "expired";

  const existing = await db.query.providerKeyHealth.findFirst({
    where: and(
      eq(providerKeyHealth.workspaceId, id.workspaceId),
      eq(providerKeyHealth.provider, id.provider),
      eq(providerKeyHealth.keyHint, id.keyHint),
    ),
  });

  const consecutiveFailures = (existing?.consecutiveFailures ?? 0) + 1;
  const cooldownUntil =
    status === "degrading" && input.cooldownSeconds
      ? new Date(Date.now() + input.cooldownSeconds * 1000)
      : null;

  await db
    .insert(providerKeyHealth)
    .values({
      workspaceId: id.workspaceId,
      provider: id.provider,
      keyId: id.keyId,
      keyHint: id.keyHint,
      status,
      consecutiveFailures,
      lastStatusCode: input.statusCode ?? null,
      lastErrorCode: input.code ?? null,
      lastErrorAt: new Date(),
      cooldownUntil,
    })
    .onConflictDoUpdate({
      target: [
        providerKeyHealth.workspaceId,
        providerKeyHealth.provider,
        providerKeyHealth.keyHint,
      ],
      set: {
        keyId: id.keyId,
        status,
        consecutiveFailures,
        lastStatusCode: input.statusCode ?? null,
        lastErrorCode: input.code ?? null,
        lastErrorAt: new Date(),
        cooldownUntil,
      },
    });
}

/** All recorded health rows for a workspace, for the router and the picker. */
export async function listKeyHealth(workspaceId: string): Promise<ProviderKeyHealthRow[]> {
  return db.query.providerKeyHealth.findMany({
    where: eq(providerKeyHealth.workspaceId, workspaceId),
  });
}

/**
 * A key is usable when it is not dead/expired and not inside a cooldown
 * window. Keys with no recorded health row count as usable (unknown = try).
 */
export function isKeyUsable(row: ProviderKeyHealthRow | undefined, now = new Date()): boolean {
  if (!row) return true;
  if (row.status === "dead" || row.status === "expired") return false;
  if (row.cooldownUntil && row.cooldownUntil > now) return false;
  return true;
}

/** Stable health identity for a platform env key. */
export function platformKeyIdentity(
  workspaceId: string,
  provider: string,
): KeyHealthIdentity {
  return { workspaceId, provider, keyId: null, keyHint: `platform:${provider}` };
}

/**
 * True when a provider has at least one usable key (workspace BYOK or the
 * platform env fallback) that is not dead/expired and not in cooldown.
 * Unknown keys count as usable (no health row yet = try first).
 */
export async function hasUsableProviderKey(
  workspaceId: string,
  provider: Provider,
): Promise<boolean> {
  const [byok, healthRows] = await Promise.all([
    db.query.providerKeys.findMany({
      where: and(
        eq(providerKeys.workspaceId, workspaceId),
        eq(providerKeys.provider, provider),
        isNull(providerKeys.revokedAt),
      ),
    }),
    listKeyHealth(workspaceId),
  ]);
  const healthByHint = new Map(healthRows.map((h) => [h.keyHint, h]));
  if (byok.some((row) => isKeyUsable(healthByHint.get(row.keyHint)))) return true;
  return Boolean(
    platformApiKey(provider) && isKeyUsable(await platformKeyHealth(provider)),
  );
}

const STATUS_RANK: Record<KeyStatus, number> = { healthy: 0, degrading: 1, expired: 2, dead: 3 };

/**
 * The platform env key is shared across every workspace, so its health is
 * global too: any workspace that observed it fail affects all workspaces.
 * The most-recently observed state wins, so a successful call anywhere (after
 * e.g. an account is topped up) re-enables the key everywhere — otherwise a
 * stale expired row in an old workspace would block it forever.
 */
export async function platformKeyHealth(
  provider: string,
): Promise<ProviderKeyHealthRow | undefined> {
  const rows = await db.query.providerKeyHealth.findMany({
    where: eq(providerKeyHealth.keyHint, `platform:${provider}`),
  });
  if (rows.length === 0) return undefined;
  return rows.sort((a, b) => {
    const at = (r: ProviderKeyHealthRow) => (r.lastErrorAt ? r.lastErrorAt.getTime() : 0);
    const byTime = at(b) - at(a);
    return byTime !== 0 ? byTime : STATUS_RANK[b.status] - STATUS_RANK[a.status];
  })[0];
}

/**
 * Health snapshot for the model picker: every provider, with one entry per
 * workspace BYOK key plus the platform env key. Providers with zero keys show
 * "missing"; untried keys are reported as "healthy" (unknown = try first).
 */
export async function chatKeyHealthSnapshot(
  workspaceId: string,
): Promise<ChatKeyHealth[]> {
  const [keys, healthRows] = await Promise.all([
    db.query.providerKeys.findMany({
      where: and(eq(providerKeys.workspaceId, workspaceId), isNull(providerKeys.revokedAt)),
    }),
    listKeyHealth(workspaceId),
  ]);
  const healthByHint = new Map(healthRows.map((h) => [h.keyHint, h]));

  const out: ChatKeyHealth[] = [];
  for (const provider of PROVIDERS) {
    const byok = keys.filter((k) => k.provider === provider);
    const entries: Array<{
      keyHint: string;
      source: "byok" | "platform";
      status: ChatKeyHealth["status"];
      lastErrorCode: string | null;
      lastErrorAt: Date | null;
    }> = [];

    for (const row of byok) {
      const h = healthByHint.get(row.keyHint);
      entries.push({
        keyHint: row.keyHint,
        source: "byok",
        status: h && h.status !== "healthy" ? h.status : "healthy",
        lastErrorCode: h?.lastErrorCode ?? null,
        lastErrorAt: h?.lastErrorAt ?? null,
      });
    }

    if (platformApiKey(provider as Provider)) {
      const h = await platformKeyHealth(provider);
      entries.push({
        keyHint: `platform:${provider}`,
        source: "platform",
        status: h && h.status !== "healthy" ? h.status : "healthy",
        lastErrorCode: h?.lastErrorCode ?? null,
        lastErrorAt: h?.lastErrorAt ?? null,
      });
    }

    if (entries.length === 0) {
      out.push({ provider, status: "missing" });
    } else {
      for (const e of entries) {
        out.push({
          provider,
          status: e.status,
          keyHint: e.keyHint,
          source: e.source,
          lastErrorCode: e.lastErrorCode ?? null,
          lastErrorAt: e.lastErrorAt ? e.lastErrorAt.toISOString() : null,
        });
      }
    }
  }
  return out;
}