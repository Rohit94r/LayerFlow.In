import { getEnv } from "../../config/env";
import { logger } from "../../config/logger";

/**
 * Minimal Resend client over its HTTP API (https://resend.com/docs/api-reference).
 *
 * Optional by design: without RESEND_API_KEY every send is a logged no-op that
 * reports `{ sent: false, skipped: true }`, so local dev and tests never need
 * a key and never hit the network.
 */

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  /** Forwarded as Resend's Idempotency-Key header (dedupe on retries). */
  idempotencyKey?: string;
}

export interface SendEmailResult {
  sent: boolean;
  skipped: boolean;
  id?: string;
  error?: string;
}

const RESEND_API_URL = "https://api.resend.com/emails";
const DEFAULT_FROM = "LayerFlow <alerts@layerflow.dev>";

let fetchImpl: typeof fetch = (...args) => globalThis.fetch(...args);

/** Test seam: swap the HTTP transport. */
export function setEmailFetch(fn: typeof fetch): void {
  fetchImpl = fn;
}

export function resetEmailFetch(): void {
  fetchImpl = (...args) => globalThis.fetch(...args);
}

export function isEmailEnabled(): boolean {
  return Boolean(getEnv().RESEND_API_KEY);
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const env = getEnv();
  const to = Array.isArray(input.to) ? input.to : [input.to];

  if (!env.RESEND_API_KEY) {
    logger.info(
      { to, subject: input.subject, idempotencyKey: input.idempotencyKey },
      "email skipped (RESEND_API_KEY not set)",
    );
    return { sent: false, skipped: true };
  }

  try {
    const res = await fetchImpl(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        ...(input.idempotencyKey ? { "Idempotency-Key": input.idempotencyKey } : {}),
      },
      body: JSON.stringify({
        from: env.FROM_EMAIL ?? DEFAULT_FROM,
        to,
        subject: input.subject,
        html: input.html,
        ...(input.text ? { text: input.text } : {}),
      }),
    });

    const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok) {
      logger.error(
        { to, subject: input.subject, status: res.status, message: body.message },
        "email send failed",
      );
      return { sent: false, skipped: false, error: body.message ?? `resend returned ${res.status}` };
    }

    logger.info({ to, subject: input.subject, id: body.id }, "email sent");
    return { sent: true, skipped: false, id: body.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "network error";
    logger.error({ to, subject: input.subject, err }, "email send errored");
    return { sent: false, skipped: false, error: message };
  }
}
