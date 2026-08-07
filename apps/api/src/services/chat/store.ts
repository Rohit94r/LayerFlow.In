import { and, asc, desc, eq, ilike, inArray, sql } from "drizzle-orm";
import type { ChatMessageRecord, ChatSession } from "@layerflow/contracts";
import { getModel } from "@layerflow/model-registry";
import { db } from "../../db/client";
import {
  aiChatMessages,
  aiChatSessions,
  type AiChatMessageRow,
  type AiChatSessionRow,
} from "../../db/schema/chat";
import { rescueReports } from "../../db/schema/rescue";

// ── DTO mapping ──────────────────────────────────────────────

export function toMessageDto(row: AiChatMessageRow): ChatMessageRecord {
  return {
    id: row.id,
    sessionId: row.sessionId,
    role: row.role as ChatMessageRecord["role"],
    content: row.content,
    model: row.model ?? null,
    provider: row.provider ?? null,
    keyHint: row.keyHint ?? null,
    tokensIn: row.tokensIn,
    tokensOut: row.tokensOut,
    cost: (row.costMicro ?? 0) / 1_000_000,
    latencyMs: row.latencyMs ?? null,
    switchedFrom: row.switchedFrom as ChatMessageRecord["switchedFrom"],
    errorCode: row.errorCode ?? null,
    errorMessage: row.errorMessage ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toSessionDto(
  row: AiChatSessionRow,
  extras?: { messageCount?: number; costMicro?: number },
): ChatSession {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    title: row.title,
    source: row.source as ChatSession["source"],
    rescueReportId: row.rescueReportId ?? null,
    defaultModel: row.defaultModel ?? null,
    autoSwitch: row.autoSwitch,
    status: row.status as ChatSession["status"],
    messageCount: extras?.messageCount ?? 0,
    cost: (extras?.costMicro ?? 0) / 1_000_000,
    lastMessageAt: row.lastMessageAt ? row.lastMessageAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ── Sessions ─────────────────────────────────────────────────

export interface CreateChatSessionInput {
  workspaceId: string;
  userId: string;
  title: string;
  source: "new" | "rescue";
  rescueReportId?: string;
  defaultModel?: string;
  autoSwitch?: boolean;
  passport?: Record<string, unknown>;
}

export async function createChatSession(input: CreateChatSessionInput): Promise<AiChatSessionRow> {
  const [row] = await db
    .insert(aiChatSessions)
    .values({
      workspaceId: input.workspaceId,
      userId: input.userId,
      title: input.title,
      source: input.source,
      rescueReportId: input.rescueReportId ?? null,
      defaultModel: input.defaultModel ?? null,
      autoSwitch: input.autoSwitch ?? true,
      passport: input.passport ?? {},
    })
    .returning();
  return row;
}

/** Per-session message count + spend for list views (single grouped query). */
export async function sessionExtras(
  workspaceId: string,
  sessionIds: string[],
): Promise<Map<string, { messageCount: number; costMicro: number }>> {
  if (sessionIds.length === 0) return new Map();
  const rows = await db
    .select({
      sessionId: aiChatMessages.sessionId,
      messageCount: sql<number>`count(*)`,
      costMicro: sql<number>`coalesce(sum(${aiChatMessages.costMicro}), 0)`,
    })
    .from(aiChatMessages)
    .where(inArray(aiChatMessages.sessionId, sessionIds))
    .groupBy(aiChatMessages.sessionId);
  return new Map(
    rows.map((r) => [r.sessionId, { messageCount: Number(r.messageCount), costMicro: Number(r.costMicro) }]),
  );
}

/** Cheap helper for single-session updates (switch / auto-switch endpoints). */
export async function sessionExtrasFor(
  workspaceId: string,
  sessionId: string,
): Promise<{ messageCount: number; costMicro: number }> {
  const map = await sessionExtras(workspaceId, [sessionId]);
  return map.get(sessionId) ?? { messageCount: 0, costMicro: 0 };
}

export async function listChatSessions(
  workspaceId: string,
  opts: { limit?: number; offset?: number; q?: string } = {},
): Promise<ChatSession[]> {
  const where = and(
    eq(aiChatSessions.workspaceId, workspaceId),
    eq(aiChatSessions.status, "active"),
    opts.q ? ilike(aiChatSessions.title, `%${opts.q}%`) : undefined,
  );
  const rows = await db.query.aiChatSessions.findMany({
    where,
    orderBy: [desc(aiChatSessions.updatedAt)],
    limit: opts.limit ?? 50,
    offset: opts.offset ?? 0,
  });
  const extras = await sessionExtras(
    workspaceId,
    rows.map((r) => r.id),
  );
  return rows.map((r) => {
    const e = extras.get(r.id);
    return toSessionDto(r, { messageCount: e?.messageCount ?? 0, costMicro: e?.costMicro ?? 0 });
  });
}

export async function getChatSession(
  workspaceId: string,
  sessionId: string,
): Promise<{ session: ChatSession; messages: ChatMessageRecord[] } | null> {
  const row = await db.query.aiChatSessions.findFirst({
    where: and(eq(aiChatSessions.id, sessionId), eq(aiChatSessions.workspaceId, workspaceId)),
  });
  if (!row) return null;

  const extras = await sessionExtras(workspaceId, [row.id]);
  const e = extras.get(row.id);
  const messages = await db.query.aiChatMessages.findMany({
    where: eq(aiChatMessages.sessionId, sessionId),
    orderBy: [asc(aiChatMessages.createdAt)],
  });
  return {
    session: toSessionDto(row, { messageCount: e?.messageCount ?? 0, costMicro: e?.costMicro ?? 0 }),
    messages: messages.map(toMessageDto),
  };
}

// ── Messages ─────────────────────────────────────────────────

export interface InsertMessageInput {
  sessionId: string;
  role: "system" | "user" | "assistant";
  content: string;
  model?: string;
  provider?: string;
  keyHint?: string;
  keyId?: string | null;
  tokensIn?: number;
  tokensOut?: number;
  costMicro?: number;
  latencyMs?: number;
  switchedFrom?: Record<string, unknown> | null;
  errorCode?: string;
  errorMessage?: string;
}

export async function insertChatMessage(input: InsertMessageInput): Promise<AiChatMessageRow> {
  const [row] = await db
    .insert(aiChatMessages)
    .values({
      sessionId: input.sessionId,
      role: input.role,
      content: input.content,
      model: input.model ?? null,
      provider: input.provider ?? null,
      keyHint: input.keyHint ?? null,
      keyId: input.keyId ?? null,
      tokensIn: input.tokensIn ?? 0,
      tokensOut: input.tokensOut ?? 0,
      costMicro: input.costMicro ?? 0,
      latencyMs: input.latencyMs ?? null,
      switchedFrom: input.switchedFrom ?? null,
      errorCode: input.errorCode ?? null,
      errorMessage: input.errorMessage ?? null,
    })
    .returning();
  return row;
}

export async function updateChatMessage(
  messageId: string,
  set: Partial<InsertMessageInput>,
): Promise<AiChatMessageRow> {
  const [row] = await db
    .update(aiChatMessages)
    .set({
      content: set.content ?? "",
      model: set.model ?? null,
      provider: set.provider ?? null,
      keyHint: set.keyHint ?? null,
      keyId: set.keyId ?? null,
      tokensIn: set.tokensIn ?? 0,
      tokensOut: set.tokensOut ?? 0,
      costMicro: set.costMicro ?? 0,
      latencyMs: set.latencyMs ?? null,
      switchedFrom: set.switchedFrom ?? null,
      errorCode: set.errorCode ?? null,
      errorMessage: set.errorMessage ?? null,
    })
    .where(eq(aiChatMessages.id, messageId))
    .returning();
  return row;
}

export async function countSessionMessages(sessionId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(aiChatMessages)
    .where(eq(aiChatMessages.sessionId, sessionId));
  return row?.count ?? 0;
}

/** Bump last_message_at + updated_at after a message lands; set title once. */
export async function touchChatSession(
  sessionId: string,
  opts: { title?: string },
): Promise<void> {
  await db
    .update(aiChatSessions)
    .set({
      lastMessageAt: new Date(),
      ...(opts.title ? { title: opts.title } : {}),
    })
    .where(eq(aiChatSessions.id, sessionId));
}

export async function setChatSessionModel(
  workspaceId: string,
  sessionId: string,
  model: string | null,
): Promise<AiChatSessionRow | null> {
  const [row] = await db
    .update(aiChatSessions)
    .set({ defaultModel: model })
    .where(and(eq(aiChatSessions.id, sessionId), eq(aiChatSessions.workspaceId, workspaceId)))
    .returning();
  return row ?? null;
}

export async function setChatSessionAutoSwitch(
  workspaceId: string,
  sessionId: string,
  autoSwitch: boolean,
): Promise<AiChatSessionRow | null> {
  const [row] = await db
    .update(aiChatSessions)
    .set({ autoSwitch })
    .where(and(eq(aiChatSessions.id, sessionId), eq(aiChatSessions.workspaceId, workspaceId)))
    .returning();
  return row ?? null;
}

export async function archiveChatSession(
  workspaceId: string,
  sessionId: string,
): Promise<boolean> {
  const [row] = await db
    .update(aiChatSessions)
    .set({ status: "archived" })
    .where(and(eq(aiChatSessions.id, sessionId), eq(aiChatSessions.workspaceId, workspaceId)))
    .returning();
  return Boolean(row);
}

// ── Rescue import ────────────────────────────────────────────

/**
 * Turn a completed rescue report into a chat session pre-seeded with the
 * improved prompt as message #1 — Rescue becomes the import pipeline for the
 * chat product (docs/conversation.md §4 Flow A).
 */
export async function importRescueToChatSession(input: {
  workspaceId: string;
  userId: string;
  rescueReportId: string;
  title?: string;
}): Promise<{ session: AiChatSessionRow; messages: AiChatMessageRow[] } | null> {
  const report = await db.query.rescueReports.findFirst({
    where: and(
      eq(rescueReports.id, input.rescueReportId),
      eq(rescueReports.workspaceId, input.workspaceId),
    ),
  });
  if (!report) return null;
  if (report.status !== "completed") {
    throw new Error("That rescue report is still processing — wait a few seconds and retry.");
  }

  const defaultModel = getModel(report.recommendedModelId)
    ? report.recommendedModelId
    : undefined;

  const session = await createChatSession({
    workspaceId: input.workspaceId,
    userId: input.userId,
    title:
      input.title ??
      (report.summary ? report.summary.slice(0, 60) : `Rescued from ${report.sourceTool}`),
    source: "rescue",
    rescueReportId: report.id,
    defaultModel,
    passport: report.passport as Record<string, unknown>,
  });

  const seeded: AiChatMessageRow[] = [];

  const contextNote =
    `I rescued this conversation from ${report.sourceTool}${
      report.sourceModel && report.sourceModel !== "unknown" ? ` (${report.sourceModel})` : ""
    }. ` +
    `Context that matters, so the thread survives: goal — ${String(
      (report.passport as { goal?: string }).goal ?? "unknown",
    )}; next action — ${String((report.passport as { nextAction?: string }).nextAction ?? "—")}. ` +
    `Continue from here without asking me to repeat anything above.`;
  seeded.push(
    await insertChatMessage({ sessionId: session.id, role: "system", content: contextNote }),
  );
  seeded.push(
    await insertChatMessage({ sessionId: session.id, role: "user", content: report.improvedPrompt }),
  );

  await db
    .update(aiChatSessions)
    .set({ lastMessageAt: new Date() })
    .where(eq(aiChatSessions.id, session.id));

  return { session, messages: seeded };
}