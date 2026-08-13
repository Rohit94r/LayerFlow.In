import type { Job } from "bullmq";
import { and, eq, sql } from "drizzle-orm";
import { logger } from "../../config/logger";
import { db } from "../../db/client";
import { agentRuns, agents } from "../../db/schema/agents";
import { enqueue } from "../queues";

/**
 * `agent-scheduled` processor (W3): fired by BullMQ JobScheduler per-agent.
 * Guards against storms (skip if agent is paused or already has a
 * running/queued run) and enqueues a normal `agent` job.
 */
export interface AgentScheduledPayload {
  agentId: string;
  workspaceId: string;
}

export async function processAgentScheduled(job: Job<AgentScheduledPayload>): Promise<void> {
  const { agentId, workspaceId } = job.data;

  const agent = await db.query.agents.findFirst({
    where: and(eq(agents.id, agentId), eq(agents.workspaceId, workspaceId)),
  });

  if (!agent) {
    logger.warn({ agentId }, "scheduled run: agent missing, skipping");
    return;
  }

  if (agent.status !== "active") {
    logger.info({ agentId, status: agent.status }, "scheduled run: agent not active, skipping");
    return;
  }

  // Storm guard: skip if there's already a queued or running job for this agent.
  const active = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(agentRuns)
    .where(
      and(
        eq(agentRuns.agentId, agentId),
        eq(agentRuns.workspaceId, workspaceId),
        sql`${agentRuns.status} IN ('queued', 'running')`,
      ),
    );
  if ((active[0]?.count ?? 0) > 0) {
    logger.info({ agentId }, "scheduled run: active run exists, skipping");
    return;
  }

  const goal = agent.goal ?? "Scheduled background work cycle.";

  const [run] = await db
    .insert(agentRuns)
    .values({
      agentId,
      workspaceId,
      input: `Scheduled run.\n\nGoal: ${goal}`,
      status: "queued",
    })
    .returning();

  await enqueue("agent", {
    agentRunId: run.id,
    agentId,
    workspaceId,
  });

  logger.info({ agentId, agentRunId: run.id }, "scheduled run enqueued");
}
