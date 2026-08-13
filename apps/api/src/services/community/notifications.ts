import { db } from "../../db/client";
import { notifications } from "../../db/schema/community";

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