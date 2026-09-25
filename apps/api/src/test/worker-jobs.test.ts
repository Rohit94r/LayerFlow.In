import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Job } from "bullmq";
import { startTestDb } from "./helpers/integration-db";

/**
 * Phase 5.2 — worker wedge job units.
 *
 * The three jobs that run in production (usage-rollup, budget-alerts,
 * weekly-digest) get exercised end-to-end here with a faked BullMQ Job: they
 * must be idempotent (safe to re-run / run from many workers) and must claim a
 * dedupe key at most once. Effects are asserted on durable Postgres tables
 * (usage_rollups, email_events), never on the mail provider.
 */

const stopDb = await startTestDb();

// Hermetic: without a Resend key every send is a logged no-op (skipped). That
// keeps the dedupe row on disk so idempotency is testable. (dotenv never
// overrides a key already set in process.env, so this beats a local .env.)
process.env.RESEND_API_KEY = "";

/** A BullMQ Job shaped like the one the workers pass to a processor. */
function fakeJob(data: Record<string, unknown> = {}): Job {
  return { id: "job-test-1", name: "test", data } as unknown as Job;
}

describe("worker wedge jobs (usage-rollup / budget-alerts / weekly-digest)", () => {
  let workspaceId = "";

  beforeAll(async () => {
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    const { db } = await import("../db/client");
    await migrate(db, { migrationsFolder: "./drizzle" });

    const { createTestSession } = await import("./auth");
    const session = await createTestSession();
    workspaceId = session.workspaceId;
  });

  afterAll(async () => {
    const { pool } = await import("../db/client");
    const { redis } = await import("../redis/client");
    redis.disconnect();
    await pool.end();
    await stopDb.stop();
  });

  it("usage-rollup recomputes today's rollup from the ledger and is idempotent", async () => {
    const { db } = await import("../db/client");
    const { usageLedger, usageRollups } = await import("../db/schema/cost");
    const { processUsageRollup } = await import("../jobs/processors/usage-rollup");
    const { eq } = await import("drizzle-orm");

    for (const [costMicro, input, output] of [
      [1_000, 100, 50],
      [2_000, 200, 100],
      [3_000, 300, 150],
    ]) {
      await db.insert(usageLedger).values({
        workspaceId,
        provider: "openai",
        model: "gpt-4o-mini",
        source: "direct",
        costMicro,
        inputTokens: input,
        outputTokens: output,
      });
    }

    await processUsageRollup(fakeJob({}));

    const today = new Date().toISOString().slice(0, 10);
    const rows = await db.query.usageRollups.findMany({
      where: (r, { and, eq: eqFn }) => and(eqFn(r.workspaceId, workspaceId), eqFn(r.day, today)),
    });

    // 3 ledger rows share every dimension → one aggregated rollup row.
    expect(rows).toHaveLength(1);
    expect(rows[0]!.requests).toBe(3);
    expect(rows[0]!.costMicro).toBe(6_000);
    expect(rows[0]!.inputTokens).toBe(600);
    expect(rows[0]!.outputTokens).toBe(300);

    // Re-running replaces instead of stacking: counts never double.
    await processUsageRollup(fakeJob({}));
    const after = await db.query.usageRollups.findMany({
      where: (r, { and, eq: eqFn }) => and(eqFn(r.workspaceId, workspaceId), eqFn(r.day, today)),
    });
    expect(after).toHaveLength(1);
    expect(after[0]!.requests).toBe(3);
    await db.delete(usageRollups).where(eq(usageRollups.workspaceId, workspaceId));
  });

  it("budget-alerts fires the 100% blocked email exactly once per tier", async () => {
    const { db } = await import("../db/client");
    const { budgets, usageLedger } = await import("../db/schema/cost");
    const { emailEvents } = await import("../db/schema/email");
    const { processBudgetAlerts } = await import("../jobs/processors/budget-alerts");
    const { currentPeriod } = await import("../services/budgets/enforce");
    const { eq } = await import("drizzle-orm");

    const period = currentPeriod();

    // A tiny budget + big spend → percentage >= 100 → blocked tier.
    await db
      .insert(budgets)
      .values({
        workspaceId,
        period,
        monthlyLimitMicro: 1_000,
        hardBlock: true,
      })
      .onConflictDoUpdate({
        target: [budgets.workspaceId, budgets.period],
        set: { monthlyLimitMicro: 1_000, hardBlock: true },
      });
    await db.insert(usageLedger).values({
      workspaceId,
      provider: "anthropic",
      model: "claude-sonnet",
      source: "gateway",
      costMicro: 5_000,
      inputTokens: 100,
      outputTokens: 50,
    });

    await processBudgetAlerts(fakeJob({}));

    const alerts = await db.query.emailEvents.findMany({
      where: (e, { and, eq: eqFn }) =>
        and(eqFn(e.workspaceId, workspaceId), eqFn(e.type, "budget_alert")),
    });
    expect(alerts).toHaveLength(1);
    expect(alerts[0]!.dedupeKey).toBe(`budget-alert:${workspaceId}:${period}:tier-100`);

    // Re-run claims the same dedupe key → no second email.
    await processBudgetAlerts(fakeJob({}));
    const again = await db.query.emailEvents.findMany({
      where: (e, { and, eq: eqFn }) =>
        and(eqFn(e.workspaceId, workspaceId), eqFn(e.type, "budget_alert")),
    });
    expect(again).toHaveLength(1);

    await db.delete(emailEvents).where(eq(emailEvents.workspaceId, workspaceId));
    await db.delete(usageLedger).where(eq(usageLedger.workspaceId, workspaceId));
  });

  it("weekly-digest sends one summary per workspace per ISO week (dedupe on re-run)", async () => {
    const { db } = await import("../db/client");
    const { emailEvents } = await import("../db/schema/email");
    const { processWeeklyDigest } = await import("../jobs/processors/weekly-digest");
    const { isoWeekLabel } = await import("../services/email/notifications");
    const { eq } = await import("drizzle-orm");

    await processWeeklyDigest(fakeJob({}));

    const digests = await db.query.emailEvents.findMany({
      where: (e, { and, eq: eqFn }) =>
        and(eqFn(e.workspaceId, workspaceId), eqFn(e.type, "weekly_digest")),
    });
    expect(digests).toHaveLength(1);
    expect(digests[0]!.dedupeKey).toBe(
      `weekly-digest:${workspaceId}:${isoWeekLabel()}`,
    );

    await processWeeklyDigest(fakeJob({}));
    const again = await db.query.emailEvents.findMany({
      where: (e, { and, eq: eqFn }) =>
        and(eqFn(e.workspaceId, workspaceId), eqFn(e.type, "weekly_digest")),
    });
    expect(again).toHaveLength(1);

    await db.delete(emailEvents).where(eq(emailEvents.workspaceId, workspaceId));
  });
});