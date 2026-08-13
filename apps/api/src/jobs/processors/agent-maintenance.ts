import { and, gt, lt, lte, ne, sql } from "drizzle-orm";
import type { Job } from "bullmq";
import { logger } from "../../config/logger";
import { db } from "../../db/client";
import { agentMemories, agentPermissions } from "../../db/schema/agents";

/**
 * `agent-maintenance` job: periodic housekeeping across all agents.
 *
 *  1. Expire time-boxed permission grants — any non-deny permission past its
 *     `expiresAt` flips to `deny` so the agent no longer owns a capability it
 *     was only granted for a window (Permission engine §6).
 *  2. Decay unused memories — memories not touched in 30 days lose 1 point of
 *     importance (floored at 1) so stale facts sink below freshly-used ones
 *     while durable history is never deleted on its own (Memory system §7).
 */
export async function processAgentMaintenance(job: Job): Promise<void> {
  const now = new Date();

  // NULL expiresAt rows are excluded by the lt() comparison — only grants that
  // carried a real expiry window can be revoked here.
  const expired = await db
    .update(agentPermissions)
    .set({ mode: "deny" })
    .where(and(ne(agentPermissions.mode, "deny"), lt(agentPermissions.expiresAt, now)))
    .returning({ id: agentPermissions.id });

  const staleCutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const decayed = await db
    .update(agentMemories)
    .set({
      importance: sql`greatest(1, ${agentMemories.importance} - 1)`,
    })
    .where(
      and(
        lte(agentMemories.lastUsedAt, staleCutoff),
        gt(agentMemories.importance, 1),
      ),
    )
    .returning({ id: agentMemories.id });

  logger.info(
    { jobId: job.id, expiredPermissions: expired.length, decayedMemories: decayed.length },
    "agent maintenance done",
  );
}