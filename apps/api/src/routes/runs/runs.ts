import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import {
  createRunRequestSchema,
  listRunsQuerySchema,
  type ListRunsResponse,
  type RunResponse,
} from "@layerflow/contracts";
import { db } from "../../db/client";
import { promptVersions } from "../../db/schema/prompts";
import { runs } from "../../db/schema/runs";
import { requireAuth } from "../../middleware/auth";
import { AppError } from "../../middleware/error";
import { executeRun, RunExecutionError } from "../../services/runs/execute";
import { toRunDetailDto, toRunDto } from "../../services/runs/dto";
import type { AppEnv } from "../../types";

export const runsRouter = new Hono<AppEnv>();

runsRouter.use(requireAuth);

// POST /api/runs — non-streaming execution
runsRouter.post("/", async (c) => {
  const workspaceId = c.get("workspaceId");
  const userId = c.get("userId");
  const requestId = c.get("requestId");
  const body = createRunRequestSchema.parse(await c.req.json());

  try {
    const { run } = await executeRun({
      workspaceId,
      userId,
      requestId,
      model: body.model,
      source: body.source,
      messages: body.messages,
      content: body.content,
      promptId: body.promptId,
      promptVersionId: body.promptVersionId,
    });
    const response: RunResponse = { run: toRunDetailDto(run) };
    return c.json(response, 201);
  } catch (err) {
    if (err instanceof RunExecutionError) {
      // Surface the failed run body alongside the error code for the UI.
      throw new AppError(err.status, err.code, err.message);
    }
    throw err;
  }
});

/**
 * Split completed output into progressive SSE deltas so UIs can render
 * incrementally. Gateway `/v1/chat/completions?stream=true` already pipes
 * true provider SSE for OpenAI-compatible vendors; this endpoint keeps the
 * LayerFlow event shape (start → delta* → done|error) stable.
 */
function chunkOutputForSse(text: string, maxChunk = 48): string[] {
  if (!text) return [];
  if (text.length <= maxChunk) return [text];
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    let end = Math.min(i + maxChunk, text.length);
    if (end < text.length) {
      const space = text.lastIndexOf(" ", end);
      if (space > i + Math.floor(maxChunk / 3)) end = space + 1;
    }
    chunks.push(text.slice(i, end));
    i = end;
  }
  return chunks;
}

/**
 * POST /api/runs/stream — SSE stream of a run.
 *
 * Runs the shared execute path (budget + persistence), then emits the output
 * as progressive `delta` events so clients can paint incrementally. True
 * token streaming from providers is still a follow-up for this route; use the
 * OpenAI-compatible gateway for live SSE from OpenAI/Groq/etc.
 */
runsRouter.post("/stream", async (c) => {
  const workspaceId = c.get("workspaceId");
  const userId = c.get("userId");
  const requestId = c.get("requestId");
  const body = createRunRequestSchema.parse(await c.req.json());

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        send("start", { model: body.model, requestId });
        // Keep-alive comment so proxies do not buffer the whole response.
        controller.enqueue(encoder.encode(": keepalive\n\n"));

        const { run } = await executeRun({
          workspaceId,
          userId,
          requestId,
          model: body.model,
          source: body.source,
          messages: body.messages,
          content: body.content,
          promptId: body.promptId,
          promptVersionId: body.promptVersionId,
        });

        for (const piece of chunkOutputForSse(run.output ?? "")) {
          send("delta", { content: piece });
        }
        send("done", { run: toRunDetailDto(run) });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Run failed";
        const code = err instanceof AppError ? err.code : "run_failed";
        send("error", { code, message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      "x-request-id": requestId,
    },
  });
});

// GET /api/runs
runsRouter.get("/", async (c) => {
  const workspaceId = c.get("workspaceId");
  const query = listRunsQuerySchema.parse(c.req.query());

  const conditions = [eq(runs.workspaceId, workspaceId)];
  if (query.promptVersionId) conditions.push(eq(runs.promptVersionId, query.promptVersionId));
  if (query.model) conditions.push(eq(runs.model, query.model));
  if (query.source) conditions.push(eq(runs.source, query.source));
  if (query.status) conditions.push(eq(runs.status, query.status));

  // promptId filter: join via prompt_versions would be ideal; for now filter in JS
  // after fetching when promptId is set (small page sizes).
  let rows = await db.query.runs.findMany({
    where: and(...conditions),
    orderBy: (r, { desc }) => [desc(r.createdAt)],
    limit: query.limit,
    offset: query.offset,
  });

  if (query.promptId) {
    const versions = await db.query.promptVersions.findMany({
      where: and(
        eq(promptVersions.promptId, query.promptId),
        eq(promptVersions.workspaceId, workspaceId),
      ),
      columns: { id: true },
    });
    const ids = new Set(versions.map((v) => v.id));
    rows = rows.filter((r) => r.promptVersionId && ids.has(r.promptVersionId));
  }

  const response: ListRunsResponse = { runs: rows.map(toRunDto) };
  return c.json(response);
});

// GET /api/runs/:id
runsRouter.get("/:id", async (c) => {
  const workspaceId = c.get("workspaceId");
  const id = c.req.param("id");

  const row = await db.query.runs.findFirst({
    where: and(eq(runs.id, id), eq(runs.workspaceId, workspaceId)),
  });
  if (!row) throw new AppError(404, "not_found", "Run not found");

  const response: RunResponse = { run: toRunDetailDto(row) };
  return c.json(response);
});
