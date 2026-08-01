import { and, eq, isNull, sql } from "drizzle-orm";
import type Redis from "ioredis";
import { db } from "../db/client";
import { createId } from "../db/schema/_helpers";
import { budgets, usageLedger, usageRollups } from "../db/schema/cost";
import { AppError } from "../middleware/app-error";
import { redis as defaultRedis } from "../redis/client";
import { ADJUST_LUA, RESERVE_LUA } from "./lua";
import {
  apiKeyMonthlyKey,
  currentDay,
  currentPeriod,
  dailyKey,
  monthlyKey,
  projectMonthlyKey,
  reservationKey,
} from "./redis-keys";

export interface ReserveBudgetInput {
  workspaceId: string;
  projectId?: string | null;
  apiKeyId?: string | null;
  /** Estimated maximum cost in micro-dollars. */
  estimateMicro: number;
  /** Override Redis client (tests). */
  redis?: Redis;
}

export interface BudgetReservation {
  reservationId: string;
  workspaceId: string;
  projectId: string | null;
  apiKeyId: string | null;
  estimateMicro: number;
  period: string;
  day: string;
  keys: string[];
}

/** Fallback when Redis is down and hardBlock=false (soft budgets). */
const softReservations = new Map<string, BudgetReservation>();

export interface SettleBudgetInput {
  reservationId: string;
  actualMicro: number;
  /** Ledger attribution. */
  provider: string;
  model: string;
  source: string;
  inputTokens?: number;
  outputTokens?: number;
  runId?: string | null;
  redis?: Redis;
}

export interface ReleaseBudgetInput {
  reservationId: string;
  redis?: Redis;
}

interface LimitSpec {
  key: string;
  limitMicro: number; // -1 = unlimited
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
    ),
  ]);
}

async function ensureRedis(client: Redis): Promise<void> {
  try {
    if (client.status !== "ready") {
      await withTimeout(client.connect().catch(() => undefined), 800, "redis connect");
    }
    const pong = await withTimeout(client.ping(), 800, "redis ping");
    if (pong !== "PONG") throw new Error("redis ping failed");
  } catch (err) {
    throw new AppError(
      503,
      "budget_unavailable",
      `Budget enforcement unavailable (Redis down): ${err instanceof Error ? err.message : "unknown"}`,
    );
  }
}

async function loadBudgetRow(workspaceId: string, period: string) {
  let row = await db.query.budgets.findFirst({
    where: (b, { and, eq }) => and(eq(b.workspaceId, workspaceId), eq(b.period, period)),
  });
  if (!row) {
    // Carry forward limits from the most recent prior period when possible.
    const prior = await db.query.budgets.findFirst({
      where: (b, { eq }) => eq(b.workspaceId, workspaceId),
      orderBy: (b, { desc }) => [desc(b.period)],
    });
    const [created] = await db
      .insert(budgets)
      .values({
        workspaceId,
        period,
        monthlyLimitMicro: prior?.monthlyLimitMicro ?? 10_000_000,
        dailyLimitMicro: prior?.dailyLimitMicro ?? null,
        alertAtPct: prior?.alertAtPct ?? 80,
        hardBlock: prior?.hardBlock ?? true,
      })
      .onConflictDoNothing()
      .returning();
    row =
      created ??
      (await db.query.budgets.findFirst({
        where: (b, { and, eq }) => and(eq(b.workspaceId, workspaceId), eq(b.period, period)),
      }));
  }
  if (!row) {
    throw new AppError(500, "budget_missing", "Could not load or create workspace budget");
  }
  return row;
}

async function buildLimitSpecs(
  workspaceId: string,
  projectId: string | null | undefined,
  apiKeyId: string | null | undefined,
  period: string,
  day: string,
): Promise<{ specs: LimitSpec[]; hardBlock: boolean; budgetId: string }> {
  const budget = await loadBudgetRow(workspaceId, period);
  const specs: LimitSpec[] = [
    { key: monthlyKey(workspaceId, period), limitMicro: budget.monthlyLimitMicro },
  ];
  if (budget.dailyLimitMicro != null) {
    specs.push({ key: dailyKey(workspaceId, day), limitMicro: budget.dailyLimitMicro });
  }

  const scopes = await db.query.budgetScopes.findMany({
    where: (s, { and, eq }) => and(eq(s.workspaceId, workspaceId), eq(s.budgetId, budget.id)),
  });

  if (projectId) {
    const scope = scopes.find((s) => s.scopeType === "project" && s.projectId === projectId);
    if (scope) {
      specs.push({
        key: projectMonthlyKey(workspaceId, projectId, period),
        limitMicro: scope.limitMicro,
      });
    }
  }
  if (apiKeyId) {
    const scope = scopes.find((s) => s.scopeType === "api_key" && s.apiKeyId === apiKeyId);
    if (scope) {
      specs.push({
        key: apiKeyMonthlyKey(workspaceId, apiKeyId, period),
        limitMicro: scope.limitMicro,
      });
    }
  }

  return { specs, hardBlock: budget.hardBlock, budgetId: budget.id };
}

async function storeReservation(client: Redis, reservation: BudgetReservation): Promise<void> {
  const key = reservationKey(reservation.reservationId);
  await client
    .multi()
    .hset(key, {
      workspaceId: reservation.workspaceId,
      projectId: reservation.projectId ?? "",
      apiKeyId: reservation.apiKeyId ?? "",
      estimateMicro: String(reservation.estimateMicro),
      period: reservation.period,
      day: reservation.day,
      keys: JSON.stringify(reservation.keys),
    })
    .expire(key, 60 * 60) // 1h safety TTL
    .exec();
}

async function loadReservation(
  client: Redis,
  reservationId: string,
): Promise<BudgetReservation | null> {
  const raw = await client.hgetall(reservationKey(reservationId));
  if (!raw || !raw.workspaceId) return null;
  return {
    reservationId,
    workspaceId: raw.workspaceId,
    projectId: raw.projectId || null,
    apiKeyId: raw.apiKeyId || null,
    estimateMicro: Number(raw.estimateMicro),
    period: raw.period,
    day: raw.day,
    keys: JSON.parse(raw.keys) as string[],
  };
}

/**
 * Atomically reserve estimated spend against workspace (+ optional scope) limits.
 * Fail-closed when Redis is down and the budget has hardBlock=true.
 */
export async function reserveBudget(input: ReserveBudgetInput): Promise<BudgetReservation> {
  const estimateMicro = Math.max(0, Math.floor(input.estimateMicro));
  const client = input.redis ?? defaultRedis;
  const period = currentPeriod();
  const day = currentDay();

  const { specs, hardBlock } = await buildLimitSpecs(
    input.workspaceId,
    input.projectId,
    input.apiKeyId,
    period,
    day,
  );

  try {
    await ensureRedis(client);
  } catch (err) {
    if (hardBlock) throw err;
    // Soft budgets: allow the call; keep reservation in-process so settle still works.
    const reservation: BudgetReservation = {
      reservationId: createId("rsv"),
      workspaceId: input.workspaceId,
      projectId: input.projectId ?? null,
      apiKeyId: input.apiKeyId ?? null,
      estimateMicro,
      period,
      day,
      keys: [],
    };
    softReservations.set(reservation.reservationId, reservation);
    return reservation;
  }

  const keys = specs.map((s) => s.key);
  const argv = [
    String(estimateMicro),
    hardBlock ? "1" : "0",
    ...specs.map((s) => String(s.limitMicro)),
  ];

  let result: number;
  try {
    result = (await client.eval(RESERVE_LUA, keys.length, ...keys, ...argv)) as number;
  } catch (err) {
    if (hardBlock) {
      throw new AppError(
        503,
        "budget_unavailable",
        `Budget enforcement unavailable (Redis error): ${err instanceof Error ? err.message : "unknown"}`,
      );
    }
    result = 1;
  }

  if (result === 0) {
    throw new AppError(
      402,
      "budget_exceeded",
      "Hard budget exceeded — this call would push spend past the configured limit",
    );
  }

  const reservation: BudgetReservation = {
    reservationId: createId("rsv"),
    workspaceId: input.workspaceId,
    projectId: input.projectId ?? null,
    apiKeyId: input.apiKeyId ?? null,
    estimateMicro,
    period,
    day,
    keys,
  };
  await storeReservation(client, reservation);
  return reservation;
}

/** Adjust counters from estimate → actual and append an immutable ledger row. */
export async function settleBudget(input: SettleBudgetInput): Promise<{ ledgerId: string }> {
  const client = input.redis ?? defaultRedis;
  const actualMicro = Math.max(0, Math.floor(input.actualMicro));

  const reservation =
    softReservations.get(input.reservationId) ??
    (await loadReservation(client, input.reservationId).catch(() => null));
  if (!reservation) {
    throw new AppError(404, "reservation_not_found", "Budget reservation not found or expired");
  }
  softReservations.delete(input.reservationId);

  const delta = actualMicro - reservation.estimateMicro;
  if (reservation.keys.length > 0) {
    try {
      await ensureRedis(client);
      if (delta !== 0) {
        await client.eval(ADJUST_LUA, reservation.keys.length, ...reservation.keys, String(delta));
      }
      await client.del(reservationKey(input.reservationId));
    } catch {
      // Ledger write still proceeds — reconciliation can heal Redis later.
    }
  }

  const [ledger] = await db
    .insert(usageLedger)
    .values({
      workspaceId: reservation.workspaceId,
      runId: input.runId ?? null,
      apiKeyId: reservation.apiKeyId,
      projectId: reservation.projectId,
      provider: input.provider,
      model: input.model,
      source: input.source,
      inputTokens: input.inputTokens ?? 0,
      outputTokens: input.outputTokens ?? 0,
      costMicro: actualMicro,
    })
    .returning();

  await upsertRollup({
    workspaceId: reservation.workspaceId,
    day: reservation.day,
    projectId: reservation.projectId,
    model: input.model,
    apiKeyId: reservation.apiKeyId,
    inputTokens: input.inputTokens ?? 0,
    outputTokens: input.outputTokens ?? 0,
    costMicro: actualMicro,
  });

  await db
    .update(budgets)
    .set({ spentMicro: sql`${budgets.spentMicro} + ${actualMicro}` })
    .where(
      and(eq(budgets.workspaceId, reservation.workspaceId), eq(budgets.period, reservation.period)),
    )
    .catch(() => undefined);

  return { ledgerId: ledger.id };
}

/** Release a reservation without charging (provider failure / early abort). */
export async function releaseBudget(input: ReleaseBudgetInput): Promise<void> {
  const client = input.redis ?? defaultRedis;
  const soft = softReservations.get(input.reservationId);
  if (soft) {
    softReservations.delete(input.reservationId);
    return;
  }

  let reservation: BudgetReservation | null = null;
  try {
    reservation = await loadReservation(client, input.reservationId);
  } catch {
    return;
  }
  if (!reservation) return;

  if (reservation.keys.length > 0 && reservation.estimateMicro > 0) {
    try {
      await ensureRedis(client);
      await client.eval(
        ADJUST_LUA,
        reservation.keys.length,
        ...reservation.keys,
        String(-reservation.estimateMicro),
      );
      await client.del(reservationKey(input.reservationId));
    } catch {
      // best-effort
    }
  } else {
    await client.del(reservationKey(input.reservationId)).catch(() => undefined);
  }
}

async function upsertRollup(args: {
  workspaceId: string;
  day: string;
  projectId: string | null;
  model: string;
  apiKeyId: string | null;
  inputTokens: number;
  outputTokens: number;
  costMicro: number;
}): Promise<void> {
  const existing = await db.query.usageRollups.findFirst({
    where: (r, { and, eq }) =>
      and(
        eq(r.workspaceId, args.workspaceId),
        eq(r.day, args.day),
        args.projectId ? eq(r.projectId, args.projectId) : isNull(r.projectId),
        eq(r.model, args.model),
        args.apiKeyId ? eq(r.apiKeyId, args.apiKeyId) : isNull(r.apiKeyId),
      ),
  });

  if (existing) {
    await db
      .update(usageRollups)
      .set({
        requests: existing.requests + 1,
        inputTokens: existing.inputTokens + args.inputTokens,
        outputTokens: existing.outputTokens + args.outputTokens,
        costMicro: existing.costMicro + args.costMicro,
      })
      .where(eq(usageRollups.id, existing.id));
    return;
  }

  await db.insert(usageRollups).values({
    workspaceId: args.workspaceId,
    day: args.day,
    projectId: args.projectId,
    model: args.model,
    apiKeyId: args.apiKeyId,
    requests: 1,
    inputTokens: args.inputTokens,
    outputTokens: args.outputTokens,
    costMicro: args.costMicro,
  });
}

/** Best-effort read of a Redis counter; returns null quickly when Redis is down. */
async function tryGetCounter(client: Redis, key: string): Promise<number | null> {
  try {
    if (client.status !== "ready") {
      await withTimeout(client.connect().catch(() => undefined), 200, "redis connect");
    }
    const v = await withTimeout(client.get(key), 200, "redis get");
    return v != null ? Number(v) : 0;
  } catch {
    return null;
  }
}

/** Read live Redis spent for a workspace monthly counter (0 if missing, null if Redis down). */
export async function getLiveMonthlySpent(
  workspaceId: string,
  period = currentPeriod(),
  client: Redis = defaultRedis,
): Promise<number | null> {
  return tryGetCounter(client, monthlyKey(workspaceId, period));
}

export async function getLiveDailySpent(
  workspaceId: string,
  day = currentDay(),
  client: Redis = defaultRedis,
): Promise<number | null> {
  return tryGetCounter(client, dailyKey(workspaceId, day));
}

/** Test helper: seed a Redis counter without going through reserve. */
export async function seedBudgetCounter(
  key: string,
  spentMicro: number,
  client: Redis = defaultRedis,
): Promise<void> {
  await ensureRedis(client);
  await client.set(key, String(spentMicro));
}

export { monthlyKey, dailyKey, currentPeriod, currentDay };
