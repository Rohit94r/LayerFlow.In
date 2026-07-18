import type { Job } from "bullmq";
import { and, eq } from "drizzle-orm";
import { logger } from "../../config/logger";
import { db } from "../../db/client";
import { promptVersions } from "../../db/schema/prompts";
import { compareJobs, compareResults, runs } from "../../db/schema/runs";
import { computeRankHints } from "../../services/compare/rank";
import { executeRun, RunExecutionError } from "../../services/runs/execute";

export interface CompareJobPayload {
  compareJobId: string;
  workspaceId: string;
  /** Concurrency limit for provider fan-out (default 3). */
  concurrency?: number;
}

/**
 * Simple promise pool — runs `limit` tasks at a time without an extra dependency.
 */
async function mapPool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;

  async function worker(): Promise<void> {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]!, i);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

/**
 * Fan out one compare job across its model list, write compare_results + ranks.
 */
export async function processCompare(job: Job<CompareJobPayload>): Promise<void> {
  const { compareJobId, workspaceId, concurrency = 3 } = job.data;

  const compareJob = await db.query.compareJobs.findFirst({
    where: and(eq(compareJobs.id, compareJobId), eq(compareJobs.workspaceId, workspaceId)),
  });
  if (!compareJob) {
    logger.warn({ compareJobId }, "compare job missing");
    return;
  }

  await db
    .update(compareJobs)
    .set({ status: "running" })
    .where(eq(compareJobs.id, compareJobId));

  let content = compareJob.content ?? "";
  if (!content && compareJob.promptVersionId) {
    const version = await db.query.promptVersions.findFirst({
      where: and(
        eq(promptVersions.id, compareJob.promptVersionId),
        eq(promptVersions.workspaceId, workspaceId),
      ),
    });
    content = version?.body ?? "";
  }

  if (!content) {
    await db
      .update(compareJobs)
      .set({ status: "failed", errorMessage: "No prompt content for compare job" })
      .where(eq(compareJobs.id, compareJobId));
    return;
  }

  const models = compareJob.models;
  const runIds: string[] = [];

  await mapPool(models, concurrency, async (model) => {
    try {
      const { run } = await executeRun({
        workspaceId,
        userId: "system",
        model,
        source: "compare",
        content,
        promptVersionId: compareJob.promptVersionId ?? undefined,
        routingReason: "compare",
      });
      runIds.push(run.id);
      await db.insert(compareResults).values({
        compareJobId,
        workspaceId,
        runId: run.id,
        rankHints: null,
      });
    } catch (err) {
      logger.warn(
        { compareJobId, model, err: err instanceof Error ? err.message : err },
        "compare model failed",
      );
      if (err instanceof RunExecutionError) {
        runIds.push(err.run.id);
        await db.insert(compareResults).values({
          compareJobId,
          workspaceId,
          runId: err.run.id,
          rankHints: null,
        });
      }
    }
  });

  // Re-load runs for ranking.
  const resultRows = await db.query.compareResults.findMany({
    where: eq(compareResults.compareJobId, compareJobId),
  });
  const runRows = await Promise.all(
    resultRows.map((r) => db.query.runs.findFirst({ where: eq(runs.id, r.runId) })),
  );

  const rankable = resultRows.map((r, i) => {
    const run = runRows[i]!;
    return {
      runId: r.runId,
      status: run?.status ?? "failed",
      costMicro: run?.costMicro ?? 0,
      latencyMs: run?.latencyMs ?? null,
      outputLength: run?.output?.length ?? 0,
    };
  });

  const hints = computeRankHints(rankable);
  for (const row of resultRows) {
    const rank = hints.get(row.runId);
    if (rank) {
      await db
        .update(compareResults)
        .set({ rankHints: rank })
        .where(eq(compareResults.id, row.id));
    }
  }

  const anySucceeded = rankable.some((r) => r.status === "succeeded");
  await db
    .update(compareJobs)
    .set({
      status: anySucceeded || resultRows.length > 0 ? "completed" : "failed",
      errorMessage: anySucceeded ? null : "All models failed",
      completedAt: new Date(),
    })
    .where(eq(compareJobs.id, compareJobId));

  logger.info(
    { compareJobId, models: models.length, results: resultRows.length },
    "compare job finished",
  );
}
