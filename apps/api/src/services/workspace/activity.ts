import { logger } from "../../config/logger";
import { db } from "../../db/client";
import { activityEvents } from "../../db/schema/workspace";

/**
 * Write a row to the workspace activity feed (GET /api/activity).
 *
 * Best-effort by design: activity is a nice-to-have, so a failure here is
 * logged and swallowed — it must never break the actual create/update request.
 */
export async function recordActivity(input: {
  workspaceId: string;
  userId?: string;
  /** Dotted event name, e.g. "prompt.created", "project.updated". */
  type: string;
  title: string;
  description?: string;
  meta?: Record<string, unknown>;
}): Promise<void> {
  try {
    await db.insert(activityEvents).values({
      workspaceId: input.workspaceId,
      userId: input.userId ?? null,
      type: input.type,
      title: input.title,
      description: input.description ?? null,
      meta: input.meta ?? null,
    });
  } catch (err) {
    logger.warn({ err, type: input.type }, "failed to record activity event");
  }
}
