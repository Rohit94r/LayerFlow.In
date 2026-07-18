import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import {
  createCompareRequestSchema,
  type CompareJobResponse,
  type CreateCompareResponse,
  type RankHints,
} from "@layerflow/contracts";
import { db } from "../../db/client";
import { promptVersions } from "../../db/schema/prompts";
import { compareJobs, compareResults, runs } from "../../db/schema/runs";
import { enqueue } from "../../jobs/queues";
import { requireAuth } from "../../middleware/auth";
import { AppError } from "../../middleware/error";
import { toRunDetailDto } from "../../services/runs/dto";
import type { AppEnv } from "../../types";

export const compareRouter = new Hono<AppEnv>();

compareRouter.use(requireAuth);

// POST /api/compare
compareRouter.post("/", async (c) => {
  const workspaceId = c.get("workspaceId");
  const body = createCompareRequestSchema.parse(await c.req.json());

  let content: string | null = body.content ?? null;
  let promptVersionId: string | null = body.promptVersionId ?? null;

  if (promptVersionId) {
    const version = await db.query.promptVersions.findFirst({
      where: and(
        eq(promptVersions.id, promptVersionId),
        eq(promptVersions.workspaceId, workspaceId),
      ),
    });
    if (!version) throw new AppError(404, "not_found", "Prompt version not found");
    content = content ?? version.body;
  }

  if (!content) {
    throw new AppError(400, "validation_error", "promptVersionId or content is required");
  }

  // For ad-hoc content without a version, we need a prompt_version_id for the
  // schema when it's still required — migration made it nullable, so store content.
  const [job] = await db
    .insert(compareJobs)
    .values({
      workspaceId,
      promptVersionId,
      content: promptVersionId ? null : content,
      models: body.models,
      status: "queued",
    })
    .returning();

  await enqueue("compare", {
    compareJobId: job.id,
    workspaceId,
    concurrency: 3,
  });

  const response: CreateCompareResponse = { jobId: job.id, status: job.status };
  return c.json(response, 202);
});

// GET /api/compare/:jobId
compareRouter.get("/:jobId", async (c) => {
  const workspaceId = c.get("workspaceId");
  const jobId = c.req.param("jobId");

  const job = await db.query.compareJobs.findFirst({
    where: and(eq(compareJobs.id, jobId), eq(compareJobs.workspaceId, workspaceId)),
  });
  if (!job) throw new AppError(404, "not_found", "Compare job not found");

  const resultRows = await db.query.compareResults.findMany({
    where: eq(compareResults.compareJobId, jobId),
  });

  const results = await Promise.all(
    resultRows.map(async (row) => {
      const run = await db.query.runs.findFirst({ where: eq(runs.id, row.runId) });
      if (!run) {
        throw new AppError(500, "internal_error", `Missing run ${row.runId} for compare result`);
      }
      return {
        id: row.id,
        runId: row.runId,
        rankHints: (row.rankHints as RankHints | null) ?? null,
        run: toRunDetailDto(run),
      };
    }),
  );

  const response: CompareJobResponse = {
    job: {
      id: job.id,
      status: job.status,
      models: job.models,
      promptVersionId: job.promptVersionId,
      errorMessage: job.errorMessage,
      createdAt: job.createdAt.toISOString(),
      completedAt: job.completedAt?.toISOString() ?? null,
    },
    results,
  };
  return c.json(response);
});
