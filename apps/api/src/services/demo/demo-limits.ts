import { getEnv } from "../../config/env";
import { logger } from "../../config/logger";
import { AppError } from "../../middleware/app-error";
import { getCurrentSubscription } from "../billing/dodo";
import { redis } from "../../redis/client";

/**
 * Demo-mode daily caps on FREE managed (platform-key) usage.
 *
 * The "free first month" gives every account ~20 managed messages a day so the
 * product is tryable, but a platform key can't be burned by one scripted loop:
 *   - per verified account / day   → DEMO_DAILY_MSGS_PER_USER  (default 20)
 *   - global across all accounts/day → DEMO_DAILY_MSGS_GLOBAL  (default 1000)
 *
 * Only free-tier / beta-mode workspaces are capped. BYOK and direct/no-store
 * keys always bypass this (the user pays the provider directly). The Redis
 * counters are best-effort: if Redis is down the request is allowed (the cap is
 * a leak-guard, not a fail-closed gate).
 */

export interface DemoLimitInfo {
  /** True when this workspace is in the free/demo tier and subject to caps. */
  applicable: boolean;
  plan: string;
  perUserLimit: number;
  globalLimit: number;
  /** Remaining free managed messages today (negative = not applicable / unknown). */
  remainingUser: number;
  remainingGlobal: number;
}

const DAY_TTL_SECONDS = 2 * 24 * 60 * 60;

export function dayLabel(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Resolve the workspace's demo tier. Free plan or beta mode (billing not
 * configured) → subject to demo caps. Paid plans → not applicable.
 */
async function demoPlan(workspaceId: string): Promise<"free" | "starter" | "pro" | "team"> {
  const sub = await getCurrentSubscription(workspaceId);
  return sub.active ? sub.plan : "free";
}

/**
 * Check + count one managed message against the free demo daily caps.
 * Throws 429 `demo_daily_limit_reached` when the account (or LayerFlow-wide)
 * daily cap is exceeded. Returns remaining counts for response headers.
 *
 * `overrides` are for tests only — production uses the env defaults and the
 * real subscription state.
 */
export async function enforceDemoLimit(
  workspaceId: string,
  ownerUserId: string,
  overrides?: {
    perUserLimit?: number;
    globalLimit?: number;
    /** Tests only — pin the day so counters never cross runs. */
    date?: Date;
    plan?: "free" | "starter" | "pro" | "team";
  },
): Promise<DemoLimitInfo> {
  const env = getEnv();
  const perUserLimit = overrides?.perUserLimit ?? env.DEMO_DAILY_MSGS_PER_USER;
  const globalLimit = overrides?.globalLimit ?? env.DEMO_DAILY_MSGS_GLOBAL;

  const base: DemoLimitInfo = {
    applicable: false,
    plan: "free",
    perUserLimit,
    globalLimit,
    remainingUser: -1,
    remainingGlobal: -1,
  };

  if (perUserLimit <= 0 && globalLimit <= 0) return base;

  const plan = overrides?.plan ?? (await demoPlan(workspaceId));
  if (plan !== "free") return { ...base, plan };

  const label = dayLabel(overrides?.date ?? new Date());
  const userKey = `lf:demo:user:${ownerUserId}:${label}`;
  const globalKey = `lf:demo:global:${label}`;

  let userCount = 0;
  let globalCount = 0;
  try {
    [userCount, globalCount] = await Promise.all([redis.incr(userKey), redis.incr(globalKey)]);
    if (userCount === 1) await redis.expire(userKey, DAY_TTL_SECONDS).catch(() => undefined);
    if (globalCount === 1) await redis.expire(globalKey, DAY_TTL_SECONDS).catch(() => undefined);
  } catch (err) {
    logger.warn({ err }, "demo limit counter unavailable — allowing request");
    return { ...base, applicable: true, plan };
  }

  const remainingUser = Math.max(0, perUserLimit - userCount);
  const remainingGlobal = Math.max(0, globalLimit - globalCount);

  const info: DemoLimitInfo = {
    applicable: true,
    plan,
    perUserLimit,
    globalLimit,
    remainingUser,
    remainingGlobal,
  };

  if (userCount > perUserLimit || globalCount > globalLimit) {
    throw new AppError(
      429,
      "demo_daily_limit_reached",
      `Free demo usage cap reached (${perUserLimit}/day). Add your own provider key (BYOK), ` +
        `use a direct/no-store key, or upgrade to keep using managed models.`,
    );
  }

  return info;
}