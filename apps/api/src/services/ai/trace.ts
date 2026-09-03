import { randomUUID } from "node:crypto";

/**
 * Generate a short trace ID for AI call correlation across logs.
 * Format: "t_" + first 8 hex chars of a random UUID for readability.
 */
export function generateTraceId(): string {
  return `t_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
}