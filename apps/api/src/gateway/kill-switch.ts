import { createHash } from "node:crypto";
import { getEnv } from "../config/env";
import { logger } from "../config/logger";
import { db } from "../db/client";
import { apiKeys } from "../db/schema/gateway";
import { workspaces } from "../db/schema/tenancy";
import { AppError } from "../middleware/app-error";
import { redis } from "../redis/client";
import { sendRunawayAlert } from "../services/email/notifications";
import { createNotification } from "../services/notifications/notifications";

/**
 * Runaway-loop kill switch.
 *
 * A buggy while-loop (or a stuck agent) tends to fire the exact same request
 * over and over — the one signature that is NOT legit parallel work. When the
 * gateway sees more than `RUNAWAY_MAX_IDENTICAL` identical (model + messages)
 * requests inside `RUNAWAY_WINDOW_SECONDS`, it auto-pauses the API key for a
 * cooldown and alerts the workspace owner. Cache hits never count, because a
 * fully-cached loop costs nothing — only provider-bound (money-burning) calls
 * are counted.
 *
 * Redis is best-effort both ways: if the block-check or counter is unavailable
 * the request is allowed rather than failing closed, keeping the gateway up
 * during a Redis blip (this is a leak-guard, not a spend limit — budgets stay
 * fail-closed via `enforce.ts`).
 */

export interface RunawayResult {
  paused: boolean;
  count: number;
  limit: number;
  windowSeconds: number;
  cooldownSeconds: number;
}

function blockedKey(apiKeyId: string): string {
  return `lf:loop:blocked:${apiKeyId}`;
}

function counterKey(apiKeyId: string, signature: string, bucket: number): string {
  return `lf:loop:cnt:${apiKeyId}:${signature}:${bucket}`;
}

/** Stable SHA-256 fingerprint of the exact request (model + messages). */
export function requestSignature(model: string, messages: unknown[]): string {
  return createHash("sha256")
    .update(JSON.stringify({ model, messages }))
    .digest("hex")
    .slice(0, 16);
}

/** True when the key is currently paused by the kill switch. */
export async function isKeyKillSwitched(apiKeyId: string): Promise<boolean> {
  try {
    return (await redis.exists(blockedKey(apiKeyId))) === 1;
  } catch (err) {
    logger.warn({ err, apiKeyId }, "kill-switch block check unavailable — allowing");
    return false;
  }
}

export function killSwitchConfig() {
  const env = getEnv();
  return {
    maxIdentical: env.RUNAWAY_MAX_IDENTICAL,
    windowSeconds: env.RUNAWAY_WINDOW_SECONDS,
    cooldownSeconds: env.RUNAWAY_COOLDOWN_SECONDS,
  };
}

/**
 * Count one provider-bound gateway call against the identical-request window.
 * When the burst crosses the threshold the key is paused for a cooldown and
 * the owner is notified (in-app + email). Returns the current count so callers
 * can set a response header.
 *
 * `overrides` are for tests only — production uses the env defaults.
 */
export async function countGatewayCall(
  args: {
    workspaceId: string;
    apiKeyId: string;
    model: string;
    messages: unknown[];
  },
  overrides?: {
    maxIdentical?: number;
    windowSeconds?: number;
    cooldownSeconds?: number;
  },
): Promise<RunawayResult> {
  const config = killSwitchConfig();
  const maxIdentical = overrides?.maxIdentical ?? config.maxIdentical;
  const windowSeconds = overrides?.windowSeconds ?? config.windowSeconds;
  const cooldownSeconds = overrides?.cooldownSeconds ?? config.cooldownSeconds;

  const result: RunawayResult = {
    paused: false,
    count: 0,
    limit: maxIdentical,
    windowSeconds,
    cooldownSeconds,
  };
  if (maxIdentical <= 0) return result;

  const signature = requestSignature(args.model, args.messages);
  const bucket = Math.floor(Date.now() / 1000 / windowSeconds);
  const key = counterKey(args.apiKeyId, signature, bucket);

  let count: number;
  try {
    count = await redis.incr(key);
    if (count === 1) await redis.expire(key, windowSeconds + 30).catch(() => undefined);
  } catch (err) {
    logger.warn({ err, apiKeyId: args.apiKeyId }, "kill-switch counter unavailable — allowing");
    return result;
  }
  result.count = count;
  if (count <= maxIdentical) return result;

  // Threshold crossed → pause the key for the cooldown.
  try {
    await redis.set(blockedKey(args.apiKeyId), String(bucket), "EX", cooldownSeconds);
  } catch (err) {
    logger.warn({ err, apiKeyId: args.apiKeyId }, "kill-switch pause failed — alerting anyway");
  }
  result.paused = true;

  void alertOwners(args.workspaceId, args.apiKeyId, args.model, count, cooldownSeconds);
  return result;
}

/** In-app notification + email to the workspace owner (fire-and-forget). */
async function alertOwners(
  workspaceId: string,
  apiKeyId: string,
  model: string,
  count: number,
  cooldownSeconds: number,
): Promise<void> {
  try {
    const workspace = await db.query.workspaces.findFirst({
      where: (w, { eq }) => eq(w.id, workspaceId),
    });
    const key = await db.query.apiKeys.findFirst({
      where: (k, { eq }) => eq(k.id, apiKeyId),
    });
    const keyName = key?.name ?? apiKeyId;

    if (workspace?.ownerUserId) {
      await createNotification({
        workspaceId,
        userId: workspace.ownerUserId,
        kind: "system",
        title: "Runaway loop auto-paused",
        body: `API key "${keyName}" made ${count} identical calls to ${model} and was paused for ${Math.max(
          1,
          Math.round(cooldownSeconds / 60),
        )} min.`,
      });
    }

    const alert = await sendRunawayAlert({
      workspaceId,
      apiKeyId,
      keyName,
      model,
      count,
      cooldownSeconds,
    });
    logger.info({ workspaceId, apiKeyId, model, count, alert }, "runaway kill switch fired");
  } catch (err) {
    logger.error({ err, workspaceId, apiKeyId }, "runaway kill switch alert failed");
  }
}

/** 429 used to reject requests on a paused key (middleware context). */
export function killSwitchBlockedError(cooldownSeconds?: number): AppError {
  const seconds = cooldownSeconds ?? killSwitchConfig().cooldownSeconds;
  const minutes = Math.max(1, Math.round(seconds / 60));
  return new AppError(
    429,
    "runaway_loop_blocked",
    `This API key was auto-paused by the runaway-loop kill switch (too many identical calls). ` +
      `It resumes automatically in ~${minutes} min.`,
  );
}