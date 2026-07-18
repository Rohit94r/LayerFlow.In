import * as Sentry from "@sentry/node";
import { getEnv } from "../config/env";
import { logger } from "../config/logger";

/**
 * Sentry error reporting. Entirely optional: without SENTRY_DSN every export
 * here is a safe no-op, so tests and local dev never need a DSN.
 *
 * Sampling defaults are conservative (10% traces in production, 0 elsewhere)
 * and can be overridden with SENTRY_TRACES_SAMPLE_RATE. Profiling is
 * deliberately not enabled.
 */

let initialized = false;

/** Header names whose values must never reach Sentry. */
const SENSITIVE_HEADERS = new Set([
  "authorization",
  "cookie",
  "set-cookie",
  "x-api-key",
  "x-goog-api-key",
  "anthropic-api-key",
]);

/** Env/field names whose values must never reach Sentry. */
const SENSITIVE_FIELD_PATTERN =
  /(api[-_]?key|apikey|secret|token|password|cookie|authorization|ciphertext|dsn|kek)/i;

/** Value shapes that look like credentials regardless of the field name. */
const SENSITIVE_VALUE_PATTERN =
  /\b(sk-[A-Za-z0-9_-]{8,}|gsk_[A-Za-z0-9_-]{8,}|lf_live_[A-Za-z0-9_-]{8,}|re_[A-Za-z0-9_-]{8,}|xai-[A-Za-z0-9_-]{8,}|AIza[A-Za-z0-9_-]{10,}|Bearer\s+[A-Za-z0-9._-]{8,})/g;

const REDACTED = "[redacted]";

/** Strip credential-looking substrings out of free text (messages, URLs). */
export function scrubText(text: string): string {
  return text.replace(SENSITIVE_VALUE_PATTERN, REDACTED);
}

/** Recursively redact sensitive keys and credential-shaped values. */
export function scrubObject(value: unknown, depth = 0): unknown {
  if (depth > 6) return REDACTED;
  if (typeof value === "string") return scrubText(value);
  if (Array.isArray(value)) return value.map((v) => scrubObject(v, depth + 1));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_FIELD_PATTERN.test(k) || SENSITIVE_HEADERS.has(k.toLowerCase())) {
        out[k] = REDACTED;
      } else {
        out[k] = scrubObject(v, depth + 1);
      }
    }
    return out;
  }
  return value;
}

/** Redact an outgoing Sentry event in place: headers, bodies, messages. */
export function scrubEvent<E extends Sentry.Event>(event: E): E {
  if (event.request) {
    // Request bodies can contain prompts and provider payloads — drop entirely.
    delete event.request.data;
    if (event.request.headers) {
      const headers: Record<string, string> = {};
      for (const [k, v] of Object.entries(event.request.headers)) {
        headers[k] = SENSITIVE_HEADERS.has(k.toLowerCase()) ? REDACTED : String(v);
      }
      event.request.headers = headers;
    }
    if (event.request.cookies) delete event.request.cookies;
    if (typeof event.request.query_string === "string") {
      event.request.query_string = scrubText(event.request.query_string);
    }
    if (typeof event.request.url === "string") {
      event.request.url = scrubText(event.request.url);
    }
  }
  if (event.message) event.message = scrubText(event.message);
  if (event.exception?.values) {
    for (const ex of event.exception.values) {
      if (ex.value) ex.value = scrubText(ex.value);
    }
  }
  if (event.extra) event.extra = scrubObject(event.extra) as Record<string, unknown>;
  if (event.contexts) event.contexts = scrubObject(event.contexts) as typeof event.contexts;
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((b) => ({
      ...b,
      message: b.message ? scrubText(b.message) : b.message,
      data: b.data ? (scrubObject(b.data) as Record<string, unknown>) : b.data,
    }));
  }
  return event;
}

/**
 * Initialize Sentry from the environment. Call once, before the HTTP server
 * or worker starts. No-op when SENTRY_DSN is unset (tests, local dev).
 */
export function initSentry(): boolean {
  if (initialized) return true;
  const env = getEnv();
  if (!env.SENTRY_DSN) return false;

  const defaultRate = env.NODE_ENV === "production" ? 0.1 : 0;
  const tracesSampleRate = Math.min(
    1,
    Math.max(0, env.SENTRY_TRACES_SAMPLE_RATE ?? defaultRate),
  );

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate,
    // Never send PII (IPs, cookies, auth headers) by default.
    sendDefaultPii: false,
    // Prompts / provider payloads must not leave the box.
    maxValueLength: 1_000,
    beforeSend(event) {
      return scrubEvent(event);
    },
    beforeSendTransaction(event) {
      return scrubEvent(event);
    },
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.data) {
        breadcrumb.data = scrubObject(breadcrumb.data) as Record<string, unknown>;
      }
      if (breadcrumb.message) breadcrumb.message = scrubText(breadcrumb.message);
      return breadcrumb;
    },
  });
  initialized = true;
  logger.info({ tracesSampleRate }, "sentry initialized");
  return true;
}

export function isSentryEnabled(): boolean {
  return initialized;
}

/** Report an exception with optional scrubbed context. No-op without a DSN. */
export function captureException(err: unknown, context?: Record<string, unknown>): void {
  if (!initialized) return;
  Sentry.captureException(err, context ? { extra: scrubObject(context) as Record<string, unknown> } : undefined);
}

/** Flush pending events (call during graceful shutdown). */
export async function flushSentry(timeoutMs = 2_000): Promise<void> {
  if (!initialized) return;
  await Sentry.flush(timeoutMs).catch(() => undefined);
}

/** Install process-level handlers so nothing dies silently. */
export function installProcessErrorHandlers(): void {
  process.on("uncaughtException", (err) => {
    logger.fatal({ err }, "uncaught exception");
    captureException(err);
    void flushSentry().finally(() => process.exit(1));
  });
  process.on("unhandledRejection", (reason) => {
    logger.error({ err: reason }, "unhandled promise rejection");
    captureException(reason);
  });
}
