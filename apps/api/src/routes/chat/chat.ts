import { Hono } from "hono";
import {
  createChatSessionRequestSchema,
  listChatSessionsQuerySchema,
  sendChatMessageRequestSchema,
  switchChatModelRequestSchema,
  type ArchiveChatSessionResponse,
  type ChatEvent,
  type ChatKeysHealthResponse,
  type CreateChatSessionResponse,
  type GetChatSessionResponse,
  type ListChatSessionsResponse,
  type SwitchChatModelResponse,
} from "@layerflow/contracts";
import { db } from "../../db/client";
import { requireAuth } from "../../middleware/auth";
import { AppError } from "../../middleware/app-error";
import { chatKeyHealthSnapshot } from "../../services/chat/health";
import { runChatMessage, type ChatRunEvent } from "../../services/chat/router";
import {
  archiveChatSession,
  createChatSession,
  getChatSession,
  importRescueToChatSession,
  listChatSessions,
  sessionExtrasFor,
  setChatSessionAutoSwitch,
  setChatSessionModel,
  toSessionDto,
} from "../../services/chat/store";
import type { AppEnv } from "../../types";

export const chatRouter = new Hono<AppEnv>();
chatRouter.use(requireAuth);

// POST /api/chat — new session, optionally imported from a rescue report
chatRouter.post("/", async (c) => {
  const workspaceId = c.get("workspaceId");
  const userId = c.get("userId");
  const body = createChatSessionRequestSchema.parse(await c.req.json());

  if (body.rescueReportId) {
    const imported = await importRescueToChatSession({
      workspaceId,
      userId,
      rescueReportId: body.rescueReportId,
      title: body.summary ? body.summary.slice(0, 60) : undefined,
    });
    if (!imported) throw new AppError(404, "not_found", "Rescue report not found");
    const extras = await sessionExtrasFor(workspaceId, imported.session.id);
    const response: CreateChatSessionResponse = {
      session: toSessionDto(imported.session, extras),
    };
    return c.json(response, 201);
  }

  const session = await createChatSession({
    workspaceId,
    userId,
    title: body.title || "New chat",
    source: "new",
    defaultModel: body.defaultModel,
    autoSwitch: body.autoSwitch,
  });
  const extras = await sessionExtrasFor(workspaceId, session.id);
  const response: CreateChatSessionResponse = {
    session: toSessionDto(session, extras),
  };
  return c.json(response, 201);
});

// GET /api/chat
chatRouter.get("/", async (c) => {
  const workspaceId = c.get("workspaceId");
  const query = listChatSessionsQuerySchema.parse(c.req.query());
  const sessions = await listChatSessions(workspaceId, {
    limit: query.limit,
    offset: query.offset,
    q: query.q,
  });
  const response: ListChatSessionsResponse = { sessions };
  return c.json(response);
});

// GET /api/chat/keys-health — status dots for the model picker
chatRouter.get("/keys-health", async (c) => {
  const providers = await chatKeyHealthSnapshot(c.get("workspaceId"));
  const response: ChatKeysHealthResponse = { providers };
  return c.json(response);
});

// POST /api/chat/:id/switch — change the default model ("auto" = let the router pick)
chatRouter.post("/:id/switch", async (c) => {
  const workspaceId = c.get("workspaceId");
  const { model } = switchChatModelRequestSchema.parse(await c.req.json());
  const next = model === "auto" ? null : model;
  const row = await setChatSessionModel(workspaceId, c.req.param("id"), next);
  if (!row) throw new AppError(404, "not_found", "Chat session not found");
  const extras = await sessionExtrasFor(workspaceId, row.id);
  const response: SwitchChatModelResponse = { session: toSessionDto(row, extras) };
  return c.json(response);
});

// PATCH /api/chat/:id/auto-switch
chatRouter.patch("/:id/auto-switch", async (c) => {
  const workspaceId = c.get("workspaceId");
  const parsed = (await c.req.json().catch(() => ({}))) as { autoSwitch?: boolean };
  if (typeof parsed.autoSwitch !== "boolean") {
    throw new AppError(400, "validation_error", "autoSwitch must be a boolean");
  }
  const row = await setChatSessionAutoSwitch(workspaceId, c.req.param("id"), parsed.autoSwitch);
  if (!row) throw new AppError(404, "not_found", "Chat session not found");
  const extras = await sessionExtrasFor(workspaceId, row.id);
  const response: SwitchChatModelResponse = { session: toSessionDto(row, extras) };
  return c.json(response);
});

// GET /api/chat/:id
chatRouter.get("/:id", async (c) => {
  const workspaceId = c.get("workspaceId");
  const result = await getChatSession(workspaceId, c.req.param("id"));
  if (!result) throw new AppError(404, "not_found", "Chat session not found");
  const response: GetChatSessionResponse = result;
  return c.json(response);
});

// DELETE /api/chat/:id
chatRouter.delete("/:id", async (c) => {
  await archiveChatSession(c.get("workspaceId"), c.req.param("id"));
  const response: ArchiveChatSessionResponse = {
    id: c.req.param("id"),
    archived: true,
  };
  return c.json(response);
});

// POST /api/chat/:id/messages — streamed SSE reply
chatRouter.post("/:id/messages", async (c) => {
  const workspaceId = c.get("workspaceId");
  const sessionId = c.req.param("id");
  const body = sendChatMessageRequestSchema.parse(await c.req.json());

  const session = await db.query.aiChatSessions.findFirst({
    where: (s, { and, eq }) => and(eq(s.id, sessionId), eq(s.workspaceId, workspaceId)),
  });
  if (!session || session.status !== "active") {
    throw new AppError(404, "not_found", "Chat session not found");
  }

  const encoder = new TextEncoder();
  const sse = new ReadableStream({
    async start(controller) {
      let closed = false;
      const emit = (obj: ChatEvent) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
        } catch {
          closed = true;
        }
      };
      const safeClose = () => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      await runChatMessage({
        workspaceId,
        sessionId,
        content: body.content,
        userModel: body.model,
        autoSwitch: body.autoSwitch ?? session.autoSwitch,
        onEvent: (e: ChatRunEvent) => {
          const event = toSseEvent(e);
          if (event) emit(event);
        },
      }).catch((err) => {
        const code = err instanceof AppError ? err.code : "internal_error";
        const message = err instanceof Error ? err.message : "Chat failed";
        emit({ type: "error", code, message });
      });

      try {
        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
      } catch {
        /* client gone */
      }
      safeClose();
    },
  });

  return new Response(sse, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
});

/** Map the router's events to the public SSE contract. */
function toSseEvent(e: ChatRunEvent): ChatEvent | null {
  switch (e.type) {
    case "start":
      return {
        type: "start",
        messageId: e.messageId!,
        model: e.model!,
        provider: e.provider!,
        keyHint: e.keyHint ?? null,
      };
    case "delta":
      return { type: "delta", text: e.text ?? "" };
    case "switched":
      return {
        type: "switched",
        fromModel: e.fromModel!,
        toModel: e.toModel!,
        reason: e.reason ?? "",
      };
    case "done":
      return e.reply ? { type: "done", message: e.reply } : null;
    case "error":
      return { type: "error", code: e.code ?? "internal_error", message: e.message ?? "Chat failed" };
    default:
      return null;
  }
}