import { getEnv } from "../../config/env";
import { logger } from "../../config/logger";

/**
 * Minimal, dependency-free PostHog capture client.
 *
 * Env-gated: without `POSTHOG_API_KEY` every call is a no-op, so local dev,
 * tests and CI never touch PostHog. Everywhere it is used fire-and-forget —
 * analytics must never fail or slow down a request.
 */

export type TrackProperties = Record<string, string | number | boolean | null | undefined>;

let overrides: { apiKey?: string; host?: string } = {};

/** Test seam: force an API key/host without reloading env. */
export function setAnalyticsOverridesForTests(o: { apiKey?: string; host?: string }): void {
  overrides = o;
}

function captureUrl(): string | null {
  const env = getEnv();
  const key = overrides.apiKey ?? env.POSTHOG_API_KEY?.trim();
  if (!key) return null;
  const host = (overrides.host ?? env.POSTHOG_HOST?.trim() ?? "https://us.i.posthog.com").replace(/\/$/, "");
  return `${host}/capture/`;
}

export function trackEvent(opts: {
  distinctId: string;
  event: string;
  workspaceId?: string;
  properties?: TrackProperties;
}): void {
  const url = captureUrl();
  const env = getEnv();
  const apiKey = overrides.apiKey ?? env.POSTHOG_API_KEY?.trim();
  if (!url || !apiKey) return;

  const body = {
    api_key: apiKey,
    event: opts.event,
    distinct_id: opts.distinctId,
    timestamp: new Date().toISOString(),
    properties: {
      $lib: "layerflow-server",
      $process_person_profile: true,
      ...(opts.workspaceId ? { workspaceId: opts.workspaceId } : {}),
      ...opts.properties,
    },
  };

  void fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch((err) => {
    logger.debug({ err }, "posthog capture failed");
  });
}