import type { CreateApiKeyResponse, CreateProviderKeyResponse } from "@layerflow/contracts";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { canConnect, startTestDb } from "./helpers/integration-db";

/**
 * Phase 4.6 security hardening:
 *  - BYOK vault KEK rotation (re-encrypt rows, audit one system event)
 *  - security audit log on key lifecycle + vault access
 *  - key scrubber proof: a direct-mode (x-lf-provider-key) secret never
 *    lands in gateway_logs / usage_ledger / provider_keys / audit_logs
 *  - fail-open safety: GATEWAY_FAIL_OPEN=allow must NOT bypass a real
 *    402 budget_exceeded.
 * Each file gets a fresh in-memory PGlite, so parallel workers never share
 * data or race migrations.
 */

process.env.GATEWAY_FAIL_OPEN = "allow";

const stopDb = await startTestDb();

const redisUrl = new URL(process.env.REDIS_URL!);
const redisUp = await canConnect(redisUrl.hostname, Number(redisUrl.port || 6379));

describe("security hardening (KEK rotation + audit + key scrubber)", () => {
  beforeAll(async () => {
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    const { db } = await import("../db/client");
    await migrate(db, { migrationsFolder: "./drizzle" });
  });

  afterAll(async () => {
    const { resetAdapterForTests } = await import("../services/ai/providers");
    resetAdapterForTests("openai");
    const { pool } = await import("../db/client");
    const { redis } = await import("../redis/client");
    await pool.end();
    redis.disconnect();
    await stopDb.stop();
  });

  it("rotates the BYOK vault to a new KEK and backfills rows + audit", async () => {
    const { createApp } = await import("../app");
    const { createTestSession } = await import("./auth");
    const { db } = await import("../db/client");
    const { providerKeys } = await import("../db/schema/gateway");
    const { eq } = await import("drizzle-orm");
    const { decryptSecret } = await import("../services/crypto");
    const { loadProviderSecret, rotateProviderKeys } = await import(
      "../services/keys/provider-keys"
    );
    const { listAuditLogs } = await import("../services/audit/log");
    const { getEnv, __resetEnvForTests } = await import("../config/env");
    const app = createApp();
    const session = await createTestSession();

    const secret = "sk-rotation-secret-1234567890abcdef";
    const created = await app.request("/api/provider-keys", {
      method: "POST",
      headers: { cookie: session.cookie, "content-type": "application/json" },
      body: JSON.stringify({ provider: "openai", secret, label: "vault-test" }),
    });
    expect(created.status).toBe(201);

    // Vault reads work with the env KEK; access + create are audited.
    expect(await loadProviderSecret(session.workspaceId, "openai")).toBe(secret);
    let logs = await listAuditLogs({ workspaceId: session.workspaceId });
    const createdAudit = logs.find((l) => l.action === "provider_key.created");
    const decryptedAudit = logs.find((l) => l.action === "provider_key.decrypted");
    expect(createdAudit?.detail?.provider).toBe("openai");
    expect(decryptedAudit).toBeTruthy();

    // Invalid KEK rejected up front.
    await expect(rotateProviderKeys("nope")).rejects.toMatchObject({
      status: 400,
      code: "invalid_kek",
    });

    // Rotate to a NEW KEK: rows re-encrypted, plaintext only in memory.
    const oldKek = getEnv().PROVIDER_KEYS_KEK;
    const newKek = oldKek === "a".repeat(64) ? "b".repeat(64) : "a".repeat(64);
    const result = await rotateProviderKeys(newKek);
    expect(result).toEqual({ rotated: 1, failed: 0 });

    const row = await db.query.providerKeys.findFirst({
      where: eq(providerKeys.workspaceId, session.workspaceId),
    });
    expect(row).toBeTruthy();
    // Ciphertext now decrypts under the NEW key and fails under the OLD one.
    expect(decryptSecret(row!.ciphertext, newKek)).toBe(secret);
    expect(() => decryptSecret(row!.ciphertext, oldKek)).toThrow();

    // Simulate the operator swapping env to the new KEK: vault still reads.
    process.env.PROVIDER_KEYS_KEK = newKek;
    __resetEnvForTests();
    try {
      expect(await loadProviderSecret(session.workspaceId, "openai")).toBe(secret);
    } finally {
      process.env.PROVIDER_KEYS_KEK = oldKek;
      __resetEnvForTests();
    }

    logs = await listAuditLogs({});
    const rotationAudit = logs.find((l) => l.action === "provider_keys.vault_rotated");
    expect(rotationAudit).toBeTruthy();
    expect(rotationAudit?.detail?.rotated).toBe(1);
  });

  it("revoking a provider key is audited", async () => {
    const { createApp } = await import("../app");
    const { createTestSession } = await import("./auth");
    const { listAuditLogs } = await import("../services/audit/log");
    const app = createApp();
    const session = await createTestSession();

    const created = await app.request("/api/provider-keys", {
      method: "POST",
      headers: { cookie: session.cookie, "content-type": "application/json" },
      body: JSON.stringify({ provider: "groq", secret: "sk-groq-revoke-1234567890" }),
    });
    const key = (await created.json() as CreateProviderKeyResponse).key;
    expect(created.status).toBe(201);

    const revoked = await app.request(`/api/provider-keys/${key.id}`, {
      method: "DELETE",
      headers: { cookie: session.cookie },
    });
    expect(revoked.status).toBe(200);

    const logs = await listAuditLogs({ workspaceId: session.workspaceId });
    expect(logs.some((l) => l.action === "provider_key.revoked")).toBe(true);
  });

  it("never persists a direct-mode provider key to logs, ledger, vault, or audit", async () => {
    const { createApp } = await import("../app");
    const { createTestSession } = await import("./auth");
    const { setAdapterForTests } = await import("../services/ai/providers");
    const { db } = await import("../db/client");
    const { eq } = await import("drizzle-orm");
    const { listAuditLogs } = await import("../services/audit/log");
    const { gatewayLogs, providerKeys } = await import("../db/schema/gateway");
    const { usageLedger } = await import("../db/schema/cost");
    const app = createApp();
    const session = await createTestSession();

    await app.request("/api/budgets/current", {
      method: "PUT",
      headers: { cookie: session.cookie, "content-type": "application/json" },
      body: JSON.stringify({ monthlyLimitMicro: 10_000_000, hardBlock: false }),
    });

    const keyRes = await app.request("/api/keys", {
      method: "POST",
      headers: { cookie: session.cookie, "content-type": "application/json" },
      body: JSON.stringify({ name: "scrubber proof" }),
    });
    const { secret } = (await keyRes.json()) as CreateApiKeyResponse;

    setAdapterForTests("openai", {
      provider: "openai",
      async chatCompletion() {
        return { content: "scrubbed", inputTokens: 4, outputTokens: 2, latencyMs: 1, raw: {} };
      },
    });

    const victim = "sk-proj-victim-scrub-33f8aabbccddeeff";
    const res = await app.request("/v1/chat/completions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${secret}`,
        "content-type": "application/json",
        "x-lf-provider-key": victim,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: `scrubber proof ${Date.now()}` }],
      }),
    });
    expect(res.status).toBe(200);

    const where = eq(gatewayLogs.workspaceId, session.workspaceId);
    const logRows = await db.query.gatewayLogs.findMany({ where });
    expect(logRows.length).toBeGreaterThan(0);
    expect(JSON.stringify(logRows)).not.toContain(victim);

    const ledgerRows = await db.query.usageLedger.findMany({
      where: eq(usageLedger.workspaceId, session.workspaceId),
    });
    expect(JSON.stringify(ledgerRows)).not.toContain(victim);

    const vaultRows = await db.query.providerKeys.findMany({
      where: eq(providerKeys.workspaceId, session.workspaceId),
    });
    expect(JSON.stringify(vaultRows)).not.toContain(victim);

    const auditRows = await listAuditLogs({ workspaceId: session.workspaceId });
    expect(JSON.stringify(auditRows)).not.toContain(victim);
  });

  it.runIf(redisUp)("still blocks a real budget_exceeded with GATEWAY_FAIL_OPEN=allow", async () => {
    const { createApp } = await import("../app");
    const { createTestSession } = await import("./auth");
    const { setAdapterForTests } = await import("../services/ai/providers");
    const app = createApp();
    const session = await createTestSession();

    await app.request("/api/budgets/current", {
      method: "PUT",
      headers: { cookie: session.cookie, "content-type": "application/json" },
      body: JSON.stringify({ monthlyLimitMicro: 1, hardBlock: true }),
    });

    const keyRes = await app.request("/api/keys", {
      method: "POST",
      headers: { cookie: session.cookie, "content-type": "application/json" },
      body: JSON.stringify({ name: "fail-open safety" }),
    });
    const { secret } = (await keyRes.json()) as CreateApiKeyResponse;

    let adapterCalled = false;
    setAdapterForTests("openai", {
      provider: "openai",
      async chatCompletion() {
        adapterCalled = true;
        return { content: "never", inputTokens: 1, outputTokens: 1, latencyMs: 1, raw: {} };
      },
    });

    const res = await app.request("/v1/chat/completions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${secret}`,
        "content-type": "application/json",
        "x-lf-provider-key": "sk-proj-budget-limit-1234567890",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: "over the limit" }],
      }),
    });
    expect(res.status).toBe(402);
    expect((await res.json() as { error: { code: string } }).error.code).toBe("budget_exceeded");
    expect(res.headers.get("x-lf-fail-open")).toBeNull();
    expect(adapterCalled).toBe(false);
  });
});