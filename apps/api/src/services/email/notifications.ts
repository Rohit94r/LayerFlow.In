import { and, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "../../db/client";
import { budgets, usageLedger } from "../../db/schema/cost";
import { emailEvents } from "../../db/schema/email";
import { users } from "../../db/schema/auth";
import { workspaces } from "../../db/schema/tenancy";
import { logger } from "../../config/logger";
import { getLiveMonthlySpent, currentPeriod } from "../../budgets/enforce";
import { sendEmail } from "./resend";
import { budgetBlockedEmail, budgetWarningEmail, weeklyDigestEmail } from "./templates";

/**
 * Budget alert + weekly digest evaluation. Idempotency lives in Postgres:
 * each logical notification claims a unique `email_events.dedupe_key` row
 * before sending, so re-running jobs (or running multiple workers) never
 * produces duplicate email.
 */

interface ClaimResult {
  claimed: boolean;
  id?: string;
}

/** Claim a dedupe key. Returns claimed=false when someone already sent it. */
async function claimEmailEvent(args: {
  workspaceId: string;
  type: "budget_alert" | "weekly_digest";
  dedupeKey: string;
  recipient: string;
}): Promise<ClaimResult> {
  const [row] = await db
    .insert(emailEvents)
    .values({
      workspaceId: args.workspaceId,
      type: args.type,
      dedupeKey: args.dedupeKey,
      recipient: args.recipient,
      status: "pending",
    })
    .onConflictDoNothing({ target: emailEvents.dedupeKey })
    .returning({ id: emailEvents.id });
  return row ? { claimed: true, id: row.id } : { claimed: false };
}

async function finishEmailEvent(
  id: string,
  result: { sent: boolean; skipped: boolean },
): Promise<void> {
  await db
    .update(emailEvents)
    .set({
      status: result.sent ? "sent" : result.skipped ? "skipped" : "failed",
      sentAt: result.sent || result.skipped ? new Date() : null,
    })
    .where(eq(emailEvents.id, id));
}

/** Failed sends release the claim so the next scheduled run retries. */
async function releaseEmailEvent(id: string): Promise<void> {
  await db.delete(emailEvents).where(eq(emailEvents.id, id));
}

async function ownerEmail(workspaceId: string): Promise<{ email: string; name: string } | null> {
  const [row] = await db
    .select({ email: users.email, name: workspaces.name })
    .from(workspaces)
    .innerJoin(users, eq(users.id, workspaces.ownerUserId))
    .where(eq(workspaces.id, workspaceId))
    .limit(1);
  return row ?? null;
}

/** Durable spend for a workspace/period from the immutable ledger. */
export async function ledgerSpentForPeriod(workspaceId: string, period: string): Promise<number> {
  const start = new Date(`${period}-01T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  const [row] = await db
    .select({ total: sql<string>`coalesce(sum(${usageLedger.costMicro}), 0)::text` })
    .from(usageLedger)
    .where(
      and(
        eq(usageLedger.workspaceId, workspaceId),
        gte(usageLedger.createdAt, start),
        lt(usageLedger.createdAt, end),
      ),
    );
  return Number(row?.total ?? 0);
}

export interface BudgetAlertOutcome {
  workspaceId: string;
  threshold: "warn" | "blocked";
  sent: boolean;
  deduped: boolean;
}

/**
 * Evaluate one workspace's current-period budget and send at most one
 * warning (>= alertAtPct) and one blocked (>= 100%) email per period.
 */
export async function evaluateBudgetAlertsForWorkspace(
  workspaceId: string,
  period = currentPeriod(),
): Promise<BudgetAlertOutcome[]> {
  const budget = await db.query.budgets.findFirst({
    where: and(eq(budgets.workspaceId, workspaceId), eq(budgets.period, period)),
  });
  if (!budget || budget.monthlyLimitMicro <= 0) return [];

  const ledgerSpent = await ledgerSpentForPeriod(workspaceId, period);
  const liveSpent = await getLiveMonthlySpent(workspaceId, period);
  // Redis includes in-flight reservations; ledger is durable truth. Use the max.
  const spentMicro = Math.max(ledgerSpent, liveSpent ?? 0);
  const pct = (spentMicro / budget.monthlyLimitMicro) * 100;

  const owner = await ownerEmail(workspaceId);
  if (!owner) return [];

  const outcomes: BudgetAlertOutcome[] = [];

  const thresholds: Array<{ kind: "warn" | "blocked"; hit: boolean }> = [
    { kind: "warn", hit: pct >= budget.alertAtPct && pct < 100 },
    { kind: "blocked", hit: pct >= 100 },
  ];

  for (const { kind, hit } of thresholds) {
    if (!hit) continue;
    const dedupeKey = `budget-alert:${workspaceId}:${period}:${kind}`;
    const claim = await claimEmailEvent({
      workspaceId,
      type: "budget_alert",
      dedupeKey,
      recipient: owner.email,
    });
    if (!claim.claimed) {
      outcomes.push({ workspaceId, threshold: kind, sent: false, deduped: true });
      continue;
    }

    const message =
      kind === "blocked"
        ? budgetBlockedEmail({
            workspaceName: owner.name,
            spentMicro,
            limitMicro: budget.monthlyLimitMicro,
            period,
          })
        : budgetWarningEmail({
            workspaceName: owner.name,
            percentUsed: pct,
            spentMicro,
            limitMicro: budget.monthlyLimitMicro,
            period,
          });

    const result = await sendEmail({
      to: owner.email,
      subject: message.subject,
      html: message.html,
      text: message.text,
      idempotencyKey: dedupeKey,
    });

    if (!result.sent && !result.skipped) {
      // Transient failure — release the claim so the next run retries.
      await releaseEmailEvent(claim.id!);
    } else {
      await finishEmailEvent(claim.id!, result);
    }
    outcomes.push({ workspaceId, threshold: kind, sent: result.sent, deduped: false });
  }

  return outcomes;
}

/** Evaluate alerts for every workspace with a budget in the current period. */
export async function evaluateBudgetAlerts(period = currentPeriod()): Promise<BudgetAlertOutcome[]> {
  const rows = await db
    .select({ workspaceId: budgets.workspaceId })
    .from(budgets)
    .where(eq(budgets.period, period));

  const outcomes: BudgetAlertOutcome[] = [];
  for (const row of rows) {
    try {
      outcomes.push(...(await evaluateBudgetAlertsForWorkspace(row.workspaceId, period)));
    } catch (err) {
      logger.error({ err, workspaceId: row.workspaceId }, "budget alert evaluation failed");
    }
  }
  return outcomes;
}

/** ISO week label like "2026-W29" (UTC). */
export function isoWeekLabel(date = new Date()): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/**
 * Send the weekly usage digest for one workspace (previous 7 UTC days).
 * Deduped per ISO week, so re-runs and multi-worker deployments are safe.
 */
export async function sendWeeklyDigestForWorkspace(
  workspaceId: string,
  now = new Date(),
): Promise<{ sent: boolean; deduped: boolean }> {
  const owner = await ownerEmail(workspaceId);
  if (!owner) return { sent: false, deduped: false };

  const weekLabel = isoWeekLabel(now);
  const dedupeKey = `weekly-digest:${workspaceId}:${weekLabel}`;
  const claim = await claimEmailEvent({
    workspaceId,
    type: "weekly_digest",
    dedupeKey,
    recipient: owner.email,
  });
  if (!claim.claimed) return { sent: false, deduped: true };

  const to = now.toISOString().slice(0, 10);
  const fromDate = new Date(now);
  fromDate.setUTCDate(fromDate.getUTCDate() - 7);
  const from = fromDate.toISOString().slice(0, 10);

  const rows = await db.query.usageRollups.findMany({
    where: (r, { and, eq, gte, lte }) =>
      and(eq(r.workspaceId, workspaceId), gte(r.day, from), lte(r.day, to)),
  });

  const totals = { requests: 0, inputTokens: 0, outputTokens: 0, costMicro: 0 };
  const byModel = new Map<string, { model: string; costMicro: number; requests: number }>();
  for (const r of rows) {
    totals.requests += r.requests;
    totals.inputTokens += r.inputTokens;
    totals.outputTokens += r.outputTokens;
    totals.costMicro += r.costMicro;
    const model = r.model ?? "unknown";
    const prev = byModel.get(model) ?? { model, costMicro: 0, requests: 0 };
    prev.costMicro += r.costMicro;
    prev.requests += r.requests;
    byModel.set(model, prev);
  }
  const topModels = [...byModel.values()].sort((a, b) => b.costMicro - a.costMicro).slice(0, 5);

  const message = weeklyDigestEmail({
    workspaceName: owner.name,
    weekLabel,
    ...totals,
    topModels,
  });

  const result = await sendEmail({
    to: owner.email,
    subject: message.subject,
    html: message.html,
    text: message.text,
    idempotencyKey: dedupeKey,
  });

  if (!result.sent && !result.skipped) {
    await releaseEmailEvent(claim.id!);
  } else {
    await finishEmailEvent(claim.id!, result);
  }
  return { sent: result.sent, deduped: false };
}

/** Weekly digest for all workspaces. */
export async function sendWeeklyDigests(now = new Date()): Promise<number> {
  const rows = await db.select({ id: workspaces.id }).from(workspaces);
  let sent = 0;
  for (const row of rows) {
    try {
      const result = await sendWeeklyDigestForWorkspace(row.id, now);
      if (result.sent) sent += 1;
    } catch (err) {
      logger.error({ err, workspaceId: row.id }, "weekly digest failed");
    }
  }
  return sent;
}
