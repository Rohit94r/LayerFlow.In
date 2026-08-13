import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import {
  appendSessionMessageRequestSchema,
  createSessionRequestSchema,
  listSessionsQuerySchema,
  updateSessionRequestSchema,
  type ListSessionsResponse,
  type PromptSession,
  type SessionDetailResponse,
  type SessionMessage,
  type SessionMessageResponse,
  type SessionResponse,
} from "@layerflow/contracts";
import { db } from "../../db/client";
import { promptSessions, sessionMessages } from "../../db/schema/sessions";
import { requireAuth } from "../../middleware/auth";
import { AppError } from "../../middleware/app-error";
import { recordActivity } from "../../services/workspace/activity";
import type { AppEnv } from "../../types";

export const sessionsRouter = new Hono<AppEnv>();

sessionsRouter.use(requireAuth);

function toSessionDto(row: typeof promptSessions.$inferSelect): PromptSession {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    domainId: row.domainId,
    projectId: row.projectId,
    title: row.title,
    description: row.description,
    status: row.status,
    totalCostMicro: row.totalCostMicro,
    totalTokens: row.totalTokens,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toMessageDto(row: typeof sessionMessages.$inferSelect): SessionMessage {
  return {
    id: row.id,
    sessionId: row.sessionId,
    role: row.role,
    body: row.body,
    promptId: row.promptId,
    promptVersionId: row.promptVersionId,
    runId: row.runId,
    position: row.position,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Load a session scoped to the workspace, or 404. */
async function getOwnedSession(workspaceId: string, sessionId: string) {
  const session = await db.query.promptSessions.findFirst({
    where: (s, { and, eq }) => and(eq(s.id, sessionId), eq(s.workspaceId, workspaceId)),
  });
  if (!session) throw new AppError(404, "not_found", "Session not found");
  return session;
}

// GET /api/sessions?projectId=&domainId=&status=
sessionsRouter.get("/", async (c) => {
  const workspaceId = c.get("workspaceId");
  const query = listSessionsQuerySchema.parse(c.req.query());

  const rows = await db.query.promptSessions.findMany({
    where: (s, { and, eq }) =>
      and(
        eq(s.workspaceId, workspaceId),
        query.projectId ? eq(s.projectId, query.projectId) : undefined,
        query.domainId ? eq(s.domainId, query.domainId) : undefined,
        query.status ? eq(s.status, query.status) : undefined,
      ),
    orderBy: (s, { desc }) => [desc(s.updatedAt)],
    limit: query.limit,
    offset: query.offset,
  });

  const response: ListSessionsResponse = { sessions: rows.map(toSessionDto) };
  return c.json(response);
});

// POST /api/sessions
sessionsRouter.post("/", async (c) => {
  const workspaceId = c.get("workspaceId");
  const userId = c.get("userId");
  const body = createSessionRequestSchema.parse(await c.req.json());

  if (body.domainId) {
    const domain = await db.query.domains.findFirst({
      where: (d, { and, eq }) => and(eq(d.id, body.domainId!), eq(d.workspaceId, workspaceId)),
    });
    if (!domain) throw new AppError(404, "not_found", "Domain not found");
  }
  if (body.projectId) {
    const project = await db.query.projects.findFirst({
      where: (p, { and, eq }) => and(eq(p.id, body.projectId!), eq(p.workspaceId, workspaceId)),
    });
    if (!project) throw new AppError(404, "not_found", "Project not found");
  }

  const [created] = await db
    .insert(promptSessions)
    .values({
      workspaceId,
      domainId: body.domainId,
      projectId: body.projectId,
      title: body.title,
      description: body.description,
    })
    .returning();

  await recordActivity({
    workspaceId,
    userId,
    type: "session.created",
    title: `Started session "${created.title}"`,
    meta: { sessionId: created.id },
  });

  const response: SessionResponse = { session: toSessionDto(created) };
  return c.json(response, 201);
});

// GET /api/sessions/:id — the session plus its messages in chain order.
sessionsRouter.get("/:id", async (c) => {
  const workspaceId = c.get("workspaceId");
  const session = await getOwnedSession(workspaceId, c.req.param("id"));

  const messages = await db.query.sessionMessages.findMany({
    where: (m, { eq }) => eq(m.sessionId, session.id),
    orderBy: (m, { asc }) => [asc(m.position)],
  });

  const response: SessionDetailResponse = {
    session: toSessionDto(session),
    messages: messages.map(toMessageDto),
  };
  return c.json(response);
});

// PATCH /api/sessions/:id — rename, edit description, change status.
sessionsRouter.patch("/:id", async (c) => {
  const workspaceId = c.get("workspaceId");
  const id = c.req.param("id");
  const body = updateSessionRequestSchema.parse(await c.req.json());

  const [updated] = await db
    .update(promptSessions)
    .set({
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
    })
    .where(and(eq(promptSessions.id, id), eq(promptSessions.workspaceId, workspaceId)))
    .returning();
  if (!updated) throw new AppError(404, "not_found", "Session not found");

  const response: SessionResponse = { session: toSessionDto(updated) };
  return c.json(response);
});

// DELETE /api/sessions/:id — hard delete; messages cascade away.
sessionsRouter.delete("/:id", async (c) => {
  const workspaceId = c.get("workspaceId");
  const id = c.req.param("id");

  const [deleted] = await db
    .delete(promptSessions)
    .where(and(eq(promptSessions.id, id), eq(promptSessions.workspaceId, workspaceId)))
    .returning();
  if (!deleted) throw new AppError(404, "not_found", "Session not found");

  return c.json({ deleted: true });
});

// POST /api/sessions/:id/messages — append the next message in the chain.
sessionsRouter.post("/:id/messages", async (c) => {
  const workspaceId = c.get("workspaceId");
  const session = await getOwnedSession(workspaceId, c.req.param("id"));
  const body = appendSessionMessageRequestSchema.parse(await c.req.json());

  // Optional links back to a prompt / version must belong to this workspace.
  if (body.promptId) {
    const prompt = await db.query.prompts.findFirst({
      where: (p, { and, eq }) => and(eq(p.id, body.promptId!), eq(p.workspaceId, workspaceId)),
    });
    if (!prompt) throw new AppError(404, "not_found", "Prompt not found");
  }
  if (body.promptVersionId) {
    const version = await db.query.promptVersions.findFirst({
      where: (v, { and, eq }) =>
        and(eq(v.id, body.promptVersionId!), eq(v.workspaceId, workspaceId)),
    });
    if (!version) throw new AppError(404, "not_found", "Prompt version not found");
  }

  const message = await db.transaction(async (tx) => {
    const latest = await tx.query.sessionMessages.findFirst({
      where: (m, { eq }) => eq(m.sessionId, session.id),
      orderBy: (m, { desc }) => [desc(m.position)],
    });

    const [inserted] = await tx
      .insert(sessionMessages)
      .values({
        sessionId: session.id,
        workspaceId,
        role: body.role,
        body: body.body,
        promptId: body.promptId,
        promptVersionId: body.promptVersionId,
        position: (latest?.position ?? -1) + 1,
      })
      .returning();

    // Touch the session so it bubbles up in "recently updated" lists.
    await tx
      .update(promptSessions)
      .set({ updatedAt: new Date() })
      .where(eq(promptSessions.id, session.id));

    return inserted;
  });

  const response: SessionMessageResponse = { message: toMessageDto(message) };
  return c.json(response, 201);
});
