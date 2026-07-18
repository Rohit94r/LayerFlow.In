import { and, asc, eq, sql } from "drizzle-orm";
import type {
  AddCollectionItemRequest,
  Collection,
  CollectionItem,
  CreateCollectionRequest,
  UpdateCollectionRequest,
} from "@layerflow/contracts";
import { db } from "../../db/client";
import { collectionItems, collections } from "../../db/schema/community";
import { prompts } from "../../db/schema/prompts";
import { AppError } from "../../middleware/error";

async function itemCount(collectionId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(collectionItems)
    .where(eq(collectionItems.collectionId, collectionId));
  return Number(row?.count ?? 0);
}

export async function toCollectionDto(
  row: typeof collections.$inferSelect,
): Promise<Collection> {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    ownerUserId: row.ownerUserId,
    title: row.title,
    description: row.description,
    visibility: row.visibility,
    itemCount: await itemCount(row.id),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** A collection is visible if it's yours, or public/unlisted. */
function canView(
  row: typeof collections.$inferSelect,
  workspaceId: string,
): boolean {
  if (row.workspaceId === workspaceId) return true;
  return row.visibility === "public" || row.visibility === "unlisted";
}

export async function listCollections(workspaceId: string): Promise<Collection[]> {
  // Own collections + public ones from others.
  const rows = await db.query.collections.findMany({
    where: (c, { or, eq }) =>
      or(eq(c.workspaceId, workspaceId), eq(c.visibility, "public")),
    orderBy: (c, { desc }) => [desc(c.updatedAt)],
    limit: 100,
  });
  return Promise.all(rows.map(toCollectionDto));
}

export async function getCollection(
  workspaceId: string,
  id: string,
): Promise<{ collection: Collection; items: CollectionItem[] }> {
  const row = await db.query.collections.findFirst({
    where: (c, { eq }) => eq(c.id, id),
  });
  if (!row || !canView(row, workspaceId)) {
    throw new AppError(404, "not_found", "Collection not found");
  }

  const itemRows = await db
    .select({
      id: collectionItems.id,
      collectionId: collectionItems.collectionId,
      promptId: collectionItems.promptId,
      sortOrder: collectionItems.sortOrder,
      createdAt: collectionItems.createdAt,
      promptTitle: prompts.title,
    })
    .from(collectionItems)
    .innerJoin(prompts, eq(prompts.id, collectionItems.promptId))
    .where(eq(collectionItems.collectionId, id))
    .orderBy(asc(collectionItems.sortOrder));

  return {
    collection: await toCollectionDto(row),
    items: itemRows.map((i) => ({
      id: i.id,
      collectionId: i.collectionId,
      promptId: i.promptId,
      promptTitle: i.promptTitle,
      sortOrder: i.sortOrder,
      createdAt: i.createdAt.toISOString(),
    })),
  };
}

export async function createCollection(
  workspaceId: string,
  userId: string,
  input: CreateCollectionRequest,
): Promise<Collection> {
  const [row] = await db
    .insert(collections)
    .values({
      workspaceId,
      ownerUserId: userId,
      title: input.title,
      description: input.description ?? null,
      visibility: input.visibility,
    })
    .returning();
  return toCollectionDto(row);
}

export async function updateCollection(
  workspaceId: string,
  userId: string,
  id: string,
  input: UpdateCollectionRequest,
): Promise<Collection> {
  const existing = await db.query.collections.findFirst({
    where: (c, { and, eq }) => and(eq(c.id, id), eq(c.workspaceId, workspaceId)),
  });
  if (!existing) throw new AppError(404, "not_found", "Collection not found");
  if (existing.ownerUserId !== userId) {
    throw new AppError(403, "forbidden", "Only the owner can edit this collection");
  }

  const [row] = await db
    .update(collections)
    .set({
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.visibility !== undefined ? { visibility: input.visibility } : {}),
    })
    .where(and(eq(collections.id, id), eq(collections.workspaceId, workspaceId)))
    .returning();
  return toCollectionDto(row);
}

export async function deleteCollection(
  workspaceId: string,
  userId: string,
  id: string,
): Promise<void> {
  const existing = await db.query.collections.findFirst({
    where: (c, { and, eq }) => and(eq(c.id, id), eq(c.workspaceId, workspaceId)),
  });
  if (!existing) throw new AppError(404, "not_found", "Collection not found");
  if (existing.ownerUserId !== userId) {
    throw new AppError(403, "forbidden", "Only the owner can delete this collection");
  }
  await db.delete(collections).where(eq(collections.id, id));
}

export async function addCollectionItem(
  workspaceId: string,
  userId: string,
  collectionId: string,
  input: AddCollectionItemRequest,
): Promise<CollectionItem> {
  const collection = await db.query.collections.findFirst({
    where: (c, { and, eq }) =>
      and(eq(c.id, collectionId), eq(c.workspaceId, workspaceId)),
  });
  if (!collection) throw new AppError(404, "not_found", "Collection not found");
  if (collection.ownerUserId !== userId) {
    throw new AppError(403, "forbidden", "Only the owner can add items");
  }

  // Prompt must be in the caller's workspace (or already public via another path —
  // for v1 we only allow adding your own prompts).
  const prompt = await db.query.prompts.findFirst({
    where: (p, { and, eq }) =>
      and(eq(p.id, input.promptId), eq(p.workspaceId, workspaceId)),
  });
  if (!prompt) throw new AppError(404, "not_found", "Prompt not found in your workspace");

  const [row] = await db
    .insert(collectionItems)
    .values({
      collectionId,
      promptId: input.promptId,
      sortOrder: input.sortOrder ?? 0,
    })
    .onConflictDoNothing()
    .returning();

  // onConflictDoNothing with no returning → already present; fetch it.
  const item =
    row ??
    (await db.query.collectionItems.findFirst({
      where: (i, { and, eq }) =>
        and(eq(i.collectionId, collectionId), eq(i.promptId, input.promptId)),
    }));
  if (!item) throw new AppError(500, "internal_error", "Could not add collection item");

  return {
    id: item.id,
    collectionId: item.collectionId,
    promptId: item.promptId,
    promptTitle: prompt.title,
    sortOrder: item.sortOrder,
    createdAt: item.createdAt.toISOString(),
  };
}

export async function removeCollectionItem(
  workspaceId: string,
  userId: string,
  collectionId: string,
  itemId: string,
): Promise<void> {
  const collection = await db.query.collections.findFirst({
    where: (c, { and, eq }) =>
      and(eq(c.id, collectionId), eq(c.workspaceId, workspaceId)),
  });
  if (!collection) throw new AppError(404, "not_found", "Collection not found");
  if (collection.ownerUserId !== userId) {
    throw new AppError(403, "forbidden", "Only the owner can remove items");
  }
  const [deleted] = await db
    .delete(collectionItems)
    .where(
      and(eq(collectionItems.id, itemId), eq(collectionItems.collectionId, collectionId)),
    )
    .returning();
  if (!deleted) throw new AppError(404, "not_found", "Collection item not found");
}
