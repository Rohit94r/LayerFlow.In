import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import type { Notification } from "@layerflow/contracts";
import { db } from "../../db/client";
import { notifications } from "../../db/schema/community";

export function toNotificationDto(row: typeof notifications.$inferSelect): Notification {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    data: row.data,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function notify(input: {
  userId: string;
  type: string;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
}): Promise<void> {
  await db.insert(notifications).values({
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    data: input.data ?? null,
  });
}

export async function listNotifications(
  userId: string,
  limit = 50,
): Promise<{ notifications: Notification[]; unreadCount: number }> {
  const rows = await db.query.notifications.findMany({
    where: (n, { eq }) => eq(n.userId, userId),
    orderBy: (n, { desc }) => [desc(n.createdAt)],
    limit,
  });
  const [unread] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));

  return {
    notifications: rows.map(toNotificationDto),
    unreadCount: Number(unread?.count ?? 0),
  };
}

export async function markNotificationsRead(
  userId: string,
  opts: { ids?: string[]; all?: boolean },
): Promise<number> {
  const now = new Date();
  if (opts.all) {
    const updated = await db
      .update(notifications)
      .set({ readAt: now })
      .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)))
      .returning({ id: notifications.id });
    return updated.length;
  }
  if (!opts.ids || opts.ids.length === 0) return 0;
  const updated = await db
    .update(notifications)
    .set({ readAt: now })
    .where(
      and(
        eq(notifications.userId, userId),
        inArray(notifications.id, opts.ids),
        isNull(notifications.readAt),
      ),
    )
    .returning({ id: notifications.id });
  return updated.length;
}
