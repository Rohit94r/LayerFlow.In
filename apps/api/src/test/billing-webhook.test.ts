import { randomUUID } from "node:crypto";
import { Webhook } from "standardwebhooks";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startTestDb } from "./helpers/integration-db";

const WEBHOOK_SECRET =
  "whsec_" + Buffer.from("layerflow-test-webhook-secret-key").toString("base64");

// Must be set before any module that triggers getEnv() (db/client, ...) so the
// cached env singleton picks the webhook secret up.
(process.env as Record<string, string>).DODO_PAYMENTS_WEBHOOK_KEY = WEBHOOK_SECRET;
(process.env as Record<string, string>).DODO_PAYMENTS_ENVIRONMENT = "test_mode";
// getDodoClient() throws 503 until the API key is set — webhook verification
// needs it too (client is built before unwrap), so a fake key avoids
// "billing_not_configured" in CI where Dodo is never configured.
(process.env as Record<string, string>).DODO_PAYMENTS_API_KEY = "dodo_test_sk_ci";

const stopDb = await startTestDb();

afterAll(async () => {
  await stopDb.stop();
});

describe("billing — Dodo checkout + webhooks", () => {
  let workspaceId: string;

  beforeAll(async () => {
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    const { db } = await import("../db/client");
    await migrate(db, { migrationsFolder: "./drizzle" });

    const { createTestSession } = await import("./auth");
    workspaceId = (await createTestSession()).workspaceId;
  });

  function sign(payload: unknown): { body: string; headers: Record<string, string> } {
    const webhook = new Webhook(WEBHOOK_SECRET);
    const id = randomUUID();
    const timestamp = new Date();
    const body = JSON.stringify(payload);
    return {
      body,
      headers: {
        "webhook-id": id,
        "webhook-timestamp": String(Math.floor(timestamp.getTime() / 1000)),
        "webhook-signature": webhook.sign(id, timestamp, body),
      },
    };
  }

  it("rejects webhooks with an invalid signature", async () => {
    const { handleWebhook } = await import("../services/billing/dodo");
    await expect(
      handleWebhook("not json", {
        "webhook-id": "evt_1",
        "webhook-timestamp": "1",
        "webhook-signature": "not-a-signature",
      }),
    ).rejects.toMatchObject({ status: 401 });
  });

  it("creates an active Pro subscription from subscription.active and dedupes", async () => {
    const { handleWebhook } = await import("../services/billing/dodo");
    const { db } = await import("../db/client");

    const event = sign({
      business_id: "bus_test_1",
      type: "subscription.active",
      timestamp: new Date().toISOString(),
      data: {
        subscription_id: "sub_test_pro_1",
        customer: { customer_id: "cus_test_1", email: "pro@test.dev", name: "Pro User" },
        product_id: "pdt_pro",
        status: "active",
        metadata: { workspace_id: workspaceId, plan: "pro" },
        next_billing_date: new Date(Date.now() + 30 * 86_400_000).toISOString(),
      },
    });

    const first = await handleWebhook(event.body, event.headers);
    expect(first.deduplicated).toBe(false);
    expect(first.type).toBe("subscription.active");

    const row = await db.query.subscriptions.findFirst({
      where: (s, { eq }) => eq(s.workspaceId, workspaceId),
    });
    expect(row).toMatchObject({
      plan: "pro",
      status: "active",
      dodoSubscriptionId: "sub_test_pro_1",
      dodoCustomerId: "cus_test_1",
    });
    expect(row?.currentPeriodEnd).toBeInstanceOf(Date);

    const eventRow = await db.query.billingEvents.findFirst({
      where: (e, { eq }) => eq(e.eventId, first.eventId),
    });
    expect(eventRow).toMatchObject({ type: "subscription.active" });

    // Replaying the same webhook-id must be a no-op.
    const replay = await handleWebhook(event.body, event.headers);
    expect(replay.deduplicated).toBe(true);
  });

  it("upserts on plan_changed and marks cancelled/expired subscriptions", async () => {
    const { handleWebhook } = await import("../services/billing/dodo");
    const { db } = await import("../db/client");

    const planChanged = sign({
      type: "subscription.plan_changed",
      timestamp: new Date().toISOString(),
      data: {
        subscription_id: "sub_test_pro_1",
        customer: { customer_id: "cus_test_1", email: "pro@example.dev", name: "Pro User" },
        status: "active",
        metadata: { workspace_id: workspaceId, plan: "starter" },
        next_billing_date: new Date(Date.now() + 30 * 86_400_000).toISOString(),
      },
    });
    const changed = await handleWebhook(planChanged.body, planChanged.headers);
    expect(changed.deduplicated).toBe(false);

    let row = await db.query.subscriptions.findFirst({
      where: (s, { eq: eqFn }) => eqFn(s.workspaceId, workspaceId),
    });
    expect(row).toMatchObject({ plan: "starter", status: "active" });

    const cancelled = sign({
      type: "subscription.cancelled",
      timestamp: new Date().toISOString(),
      data: {
        subscription_id: "sub_test_pro_1",
        customer: { customer_id: "cus_test_1", email: "pro@example.dev", name: "Pro User" },
        status: "cancelled",
        metadata: { workspace_id: workspaceId, plan: "starter" },
      },
    });
    const done = await handleWebhook(cancelled.body, cancelled.headers);
    expect(done.deduplicated).toBe(false);

    row = await db.query.subscriptions.findFirst({
      where: (s, { eq: eqFn }) => eqFn(s.workspaceId, workspaceId),
    });
    expect(row).toMatchObject({ plan: "starter", status: "cancelled" });
  });
});