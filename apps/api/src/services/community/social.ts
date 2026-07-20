import { and, eq, sql } from "drizzle-orm";
import type {
  Comment,
  CreateCommentRequest,
  LikeRequest,
} from "@layerflow/contracts";
import { db } from "../../db/client";
import { comments, likes } from "../../db/schema/community";
import { AppError } from "../../middleware/app-error";
import { notify } from "./notifications";

async function likeCount(
  subjectType: LikeRequest["subjectType"],
  subjectId: string,
): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(likes)
    .where(and(eq(likes.subjectType, subjectType), eq(likes.subjectId, subjectId)));
  return Number(row?.count ?? 0);
}

export async function likeSubject(
  userId: string,
  input: LikeRequest,
): Promise<{ liked: boolean; likeCount: number }> {
  await db
    .insert(likes)
    .values({
      userId,
      subjectType: input.subjectType,
      subjectId: input.subjectId,
    })
    .onConflictDoNothing();

  return { liked: true, likeCount: await likeCount(input.subjectType, input.subjectId) };
}

export async function unlikeSubject(
  userId: string,
  input: LikeRequest,
): Promise<{ liked: boolean; likeCount: number }> {
  await db
    .delete(likes)
    .where(
      and(
        eq(likes.userId, userId),
        eq(likes.subjectType, input.subjectType),
        eq(likes.subjectId, input.subjectId),
      ),
    );
  return { liked: false, likeCount: await likeCount(input.subjectType, input.subjectId) };
}

export function toCommentDto(row: typeof comments.$inferSelect): Comment {
  return {
    id: row.id,
    userId: row.userId,
    subjectType: row.subjectType,
    subjectId: row.subjectId,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function createComment(
  userId: string,
  input: CreateCommentRequest,
): Promise<Comment> {
  const [row] = await db
    .insert(comments)
    .values({
      userId,
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      body: input.body,
    })
    .returning();

  // Best-effort: notify the collection owner when someone comments.
  if (input.subjectType === "collection") {
    const collection = await db.query.collections.findFirst({
      where: (c, { eq }) => eq(c.id, input.subjectId),
    });
    if (collection && collection.ownerUserId !== userId) {
      await notify({
        userId: collection.ownerUserId,
        type: "comment",
        title: "New comment on your collection",
        body: input.body.slice(0, 140),
        data: { collectionId: collection.id, commentId: row.id },
      });
    }
  }

  return toCommentDto(row);
}

export async function listComments(
  subjectType: CreateCommentRequest["subjectType"],
  subjectId: string,
  limit = 50,
): Promise<Comment[]> {
  const rows = await db.query.comments.findMany({
    where: (c, { and, eq, isNull }) =>
      and(eq(c.subjectType, subjectType), eq(c.subjectId, subjectId), isNull(c.deletedAt)),
    orderBy: (c, { asc }) => [asc(c.createdAt)],
    limit,
  });
  return rows.map(toCommentDto);
}

export async function deleteComment(userId: string, commentId: string): Promise<void> {
  const existing = await db.query.comments.findFirst({
    where: (c, { eq }) => eq(c.id, commentId),
  });
  if (!existing || existing.deletedAt) {
    throw new AppError(404, "not_found", "Comment not found");
  }
  if (existing.userId !== userId) {
    throw new AppError(403, "forbidden", "You can only delete your own comments");
  }
  await db
    .update(comments)
    .set({ deletedAt: new Date() })
    .where(eq(comments.id, commentId));
}
