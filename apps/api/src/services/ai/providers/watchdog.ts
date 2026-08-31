/**
 * Provider-call watchdog.
 *
 * A provider endpoint that silently hangs (connection opens, no error, no
 * first byte — e.g. a blocked/throttled network path) must never hang the
 * user's request forever. This wraps a provider call with timers:
 *
 * - first-delta watchdog: aborts when no first delta arrives in time
 *   (for non-streaming adapters the single onDelta fires only after the full
 *   response, so this acts as a generous total-call budget)
 * - idle watchdog: re-armed on every delta, aborts when a stream stalls
 *
 * On timeout the underlying fetch is aborted and callers map the failure to
 * `provider_timeout` (504) so failover chains move to the next provider
 * instead of hanging the chat UI on keepalives forever.
 */

import { AppError } from "../../../middleware/app-error";

const DEFAULT_FIRST_DELTA_MS = 25_000;
const DEFAULT_IDLE_MS = 45_000;
/** Total budget for non-streaming adapter calls (the whole response is one delta). */
const DEFAULT_TOTAL_MS = 90_000;

function envNumber(name: string): number | undefined {
  const raw = process.env[name];
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1_000 ? n : undefined;
}

function firstDeltaDefault(): number {
  return envNumber("PROVIDER_FIRST_DELTA_TIMEOUT_MS") ?? DEFAULT_FIRST_DELTA_MS;
}

function idleDefault(): number {
  return envNumber("PROVIDER_STREAM_IDLE_TIMEOUT_MS") ?? DEFAULT_IDLE_MS;
}

export interface WatchdogConfig {
  /** Abort when no first delta arrives within this window. */
  firstDeltaMs?: number;
  /** Abort when no delta arrives for this long mid-stream. */
  idleMs?: number;
}

export interface ProviderWatchdog {
  /** Signal to pass to the provider request (child of the caller's signal). */
  signal: AbortSignal;
  /** Wrap the caller's onDelta so the watchdog observes stream progress. */
  wrapOnDelta: (onDelta: (text: string) => void | Promise<void>) => (text: string) => void;
  /** True when the watchdog (not the caller's signal) aborted the call. */
  timedOut: () => boolean;
  /** True when the caller's signal aborted (client went away) — not a provider failure. */
  callerAborted: () => boolean;
  /** Clear timers after the call settles. */
  dispose: () => void;
}

export function createProviderWatchdog(
  parentSignal: AbortSignal | undefined,
  cfg: WatchdogConfig = {},
): ProviderWatchdog {
  const firstDeltaMs = cfg.firstDeltaMs ?? firstDeltaDefault();
  const idleMs = cfg.idleMs ?? idleDefault();

  const controller = new AbortController();
  let watchdogFired = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const arm = (ms: number, label: string) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      watchdogFired = true;
      controller.abort(new Error(label));
    }, ms);
  };

  if (parentSignal) {
    if (parentSignal.aborted) {
      controller.abort(parentSignal.reason);
    } else {
      parentSignal.addEventListener(
        "abort",
        () => controller.abort(parentSignal.reason),
        { once: true },
      );
    }
  }

  arm(
    firstDeltaMs,
    `provider timed out: no response within ${Math.round(firstDeltaMs / 1000)}s`,
  );

  const wrapOnDelta =
    (onDelta: (text: string) => void | Promise<void>) =>
    (text: string): void => {
      arm(idleMs, `provider timed out: stream stalled for ${Math.round(idleMs / 1000)}s`);
      void onDelta(text);
    };

  return {
    signal: controller.signal,
    wrapOnDelta,
    timedOut: () => watchdogFired,
    callerAborted: () => Boolean(parentSignal?.aborted) && !watchdogFired,
    dispose: () => {
      if (timer) clearTimeout(timer);
    },
  };
}

/**
 * Watchdog preset for non-streaming adapters: the single onDelta fires after
 * the complete response, so the first-delta window is raised to a total-call
 * budget instead of a TTFB budget.
 */
export function createNonStreamingWatchdog(
  parentSignal: AbortSignal | undefined,
): ProviderWatchdog {
  return createProviderWatchdog(parentSignal, {
    firstDeltaMs: envNumber("PROVIDER_TOTAL_TIMEOUT_MS") ?? DEFAULT_TOTAL_MS,
  });
}

/** Typed error for watchdog timeouts — failover chains catch and move on. */
export function providerTimeoutError(): AppError {
  return new AppError(
    504,
    "provider_timeout",
    "The provider did not respond in time — trying the next available model.",
  );
}
