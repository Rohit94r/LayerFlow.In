import { and, count, desc, eq, inArray } from "drizzle-orm";
import type { Notification, NotificationKind } from "@layerflow/contracts";
import { db } from "../../db/client";
import { notifications } from "../../db/schema/community";

export function toNotificationDto(row: typeof notifications.$inferSelect): Notification {
  return {
    id: row.id,
    workspaceId: row.workspaceId ?? null,
    userId: row.userId,
    kind: row.kind,
    title: row.title,
    body: row.body ?? null,
    agentId: row.agentId ?? null,
    read: row.read,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function createNotification(input: {
  workspaceId: string;
  userId: string;
  kind: NotificationKind;
  title: string;
  body?: string | null;
  agentId?: string | null;
}): Promise<void> {
  await db.insert(notifications).values({
    workspaceId: input.workspaceId,
    userId: input.userId,
    kind: input.kind,
    type: input.kind,
    title: input.title,
    body: input.body ?? null,
    agentId: input.agentId ?? null,
  });
}

export async function listNotifications(
  workspaceId: string,
  userId: string,
  opts: { limit?: number; offset?: number } = {},
): Promise<{ notifications: Notification[]; total: number }> {
  const where = and(eq(notifications.workspaceId, workspaceId), eq(notifications.userId, userId));
  const [rows, totalRows] = await Promise.all([
    db.query.notifications.findMany({
      where,
      orderBy: [desc(notifications.createdAt)],
      limit: opts.limit,
      offset: opts.offset,
    }),
    db.select({ count: count() }).from(notifications).where(where),
  ]);
  return {
    notifications: rows.map(toNotificationDto),
    total: totalRows[0]?.count ?? 0,
  };
}

export async function markNotificationsRead(
  workspaceId: string,
  userId: string,
  ids?: string[],
): Promise<number> {
  const where =
    ids && ids.length > 0
      ? and(
          eq(notifications.workspaceId, workspaceId),
          eq(notifications.userId, userId),
          eq(notifications.read, false),
          inArray(notifications.id, ids),
        )
      : and(
          eq(notifications.workspaceId, workspaceId),
          eq(notifications.userId, userId),
          eq(notifications.read, false),
        );
  const updated = await db
    .update(notifications)
    .set({ read: true })
    .where(where)
    .returning({ id: notifications.id });
  return updated.length;
}

export async function unreadCount(workspaceId: string, userId: string): Promise<number> {
  const rows = await db
    .select({ count: count() })
    .from(notifications)
    .where(
      and(
        eq(notifications.workspaceId, workspaceId),
        eq(notifications.userId, userId),
        eq(notifications.read, false),
      ),
    );
  return rows[0]?.count ?? 0;
}