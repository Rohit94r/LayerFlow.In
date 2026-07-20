import { and, desc, eq, ilike, inArray, isNull, notInArray } from "drizzle-orm";
import { Hono } from "hono";
import {
  createPromptRequestSchema,
  createPromptVersionRequestSchema,
  listPromptsQuerySchema,
  updatePromptRequestSchema,
  type ListPromptVersionsResponse,
  type ListPromptsResponse,
  type Prompt,
  type PromptResponse,
  type PromptVersion,
  type PromptVersionResponse,
} from "@layerflow/contracts";
import { db } from "../../db/client";
import {
  favorites,
  prompts,
  promptTags,
  promptVariables,
  promptVersions,
} from "../../db/schema/prompts";
import { requireAuth } from "../../middleware/auth";
import { AppError } from "../../middleware/app-error";
import { recordActivity } from "../../services/workspace/activity";
import type { AppEnv } from "../../types";

export const promptsRouter = new Hono<AppEnv>();

promptsRouter.use(requireAuth);

type PromptRow = typeof prompts.$inferSelect;
type VersionRow = typeof promptVersions.$inferSelect;

function toPromptDto(row: PromptRow, tags: string[], favorite: boolean): Prompt {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    domainId: row.domainId,
    projectId: row.projectId,
    folderId: row.folderId,
    title: row.title,
    description: row.description,
    notes: row.notes,
    currentVersionId: row.currentVersionId,
    tags,
    favorite,
    archivedAt: row.archivedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toVersionDto(row: VersionRow): PromptVersion {
  return {
    id: row.id,
    promptId: row.promptId,
    version: row.version,
    body: row.body,
    note: row.note,
    modelHint: row.modelHint,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Load a prompt scoped to the workspace, or 404. */
async function getOwnedPrompt(workspaceId: string, promptId: string): Promise<PromptRow> {
  const prompt = await db.query.prompts.findFirst({
    where: (p, { and, eq }) => and(eq(p.id, promptId), eq(p.workspaceId, workspaceId)),
  });
  if (!prompt) throw new AppError(404, "not_found", "Prompt not found");
  return prompt;
}

/** Tags for a set of prompts, as a promptId → tags[] map. */
async function tagsByPromptId(promptIds: string[]): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (promptIds.length === 0) return map;
  const rows = await db.query.promptTags.findMany({
    where: (t, { inArray }) => inArray(t.promptId, promptIds),
    orderBy: (t, { asc }) => [asc(t.tag)],
  });
  for (const row of rows) {
    map.set(row.promptId, [...(map.get(row.promptId) ?? []), row.tag]);
  }
  return map;
}

/** Which of these prompts has the current user favorited? */
async function favoritePromptIds(userId: string, promptIds: string[]): Promise<Set<string>> {
  if (promptIds.length === 0) return new Set();
  const rows = await db.query.favorites.findMany({
    where: (f, { and, eq, inArray }) =>
      and(eq(f.userId, userId), inArray(f.promptId, promptIds)),
  });
  return new Set(rows.map((r) => r.promptId));
}

/** Full DTO for one prompt (tags + favorite flag + current version). */
async function buildPromptResponse(
  userId: string,
  prompt: PromptRow,
): Promise<PromptResponse> {
  const tags = await tagsByPromptId([prompt.id]);
  const favs = await favoritePromptIds(userId, [prompt.id]);
  const currentVersion = prompt.currentVersionId
    ? await db.query.promptVersions.findFirst({
        where: (v, { eq }) => eq(v.id, prompt.currentVersionId!),
      })
    : undefined;
  return {
    prompt: toPromptDto(prompt, tags.get(prompt.id) ?? [], favs.has(prompt.id)),
    currentVersion: currentVersion ? toVersionDto(currentVersion) : null,
  };
}

/** Check that a referenced domain/project/folder belongs to this workspace. */
async function assertOwnedRefs(
  workspaceId: string,
  refs: { domainId?: string | null; projectId?: string | null; folderId?: string | null },
) {
  if (refs.domainId) {
    const domain = await db.query.domains.findFirst({
      where: (d, { and, eq }) => and(eq(d.id, refs.domainId!), eq(d.workspaceId, workspaceId)),
    });
    if (!domain) throw new AppError(404, "not_found", "Domain not found");
  }
  if (refs.projectId) {
    const project = await db.query.projects.findFirst({
      where: (p, { and, eq }) => and(eq(p.id, refs.projectId!), eq(p.workspaceId, workspaceId)),
    });
    if (!project) throw new AppError(404, "not_found", "Project not found");
  }
  if (refs.folderId) {
    const folder = await db.query.folders.findFirst({
      where: (f, { and, eq }) => and(eq(f.id, refs.folderId!), eq(f.workspaceId, workspaceId)),
    });
    if (!folder) throw new AppError(404, "not_found", "Folder not found");
  }
}

// GET /api/prompts?domainId=&projectId=&folderId=&tag=&favorite=&q=&includeArchived=&limit=&offset=
promptsRouter.get("/", async (c) => {
  const workspaceId = c.get("workspaceId");
  const userId = c.get("userId");
  const query = listPromptsQuerySchema.parse(c.req.query());

  const conditions = [
    eq(prompts.workspaceId, workspaceId),
    query.includeArchived ? undefined : isNull(prompts.archivedAt),
    query.domainId ? eq(prompts.domainId, query.domainId) : undefined,
    query.projectId ? eq(prompts.projectId, query.projectId) : undefined,
    query.folderId ? eq(prompts.folderId, query.folderId) : undefined,
    query.q ? ilike(prompts.title, `%${query.q}%`) : undefined,
  ];

  // Tag filter: prompt must have a matching prompt_tags row.
  if (query.tag) {
    conditions.push(
      inArray(
        prompts.id,
        db
          .select({ id: promptTags.promptId })
          .from(promptTags)
          .where(and(eq(promptTags.workspaceId, workspaceId), eq(promptTags.tag, query.tag))),
      ),
    );
  }

  // Favorite filter: favorites are per-user rows in the favorites table.
  if (query.favorite !== undefined) {
    const favoriteIds = db
      .select({ id: favorites.promptId })
      .from(favorites)
      .where(and(eq(favorites.workspaceId, workspaceId), eq(favorites.userId, userId)));
    conditions.push(
      query.favorite ? inArray(prompts.id, favoriteIds) : notInArray(prompts.id, favoriteIds),
    );
  }

  const rows = await db
    .select()
    .from(prompts)
    .where(and(...conditions.filter((cond) => cond !== undefined)))
    .orderBy(desc(prompts.updatedAt))
    .limit(query.limit)
    .offset(query.offset);

  const ids = rows.map((r) => r.id);
  const tags = await tagsByPromptId(ids);
  const favs = await favoritePromptIds(userId, ids);

  const response: ListPromptsResponse = {
    prompts: rows.map((row) => toPromptDto(row, tags.get(row.id) ?? [], favs.has(row.id))),
  };
  return c.json(response);
});

// POST /api/prompts — creates the prompt AND its immutable version 1.
promptsRouter.post("/", async (c) => {
  const workspaceId = c.get("workspaceId");
  const userId = c.get("userId");
  const body = createPromptRequestSchema.parse(await c.req.json());

  await assertOwnedRefs(workspaceId, body);

  const created = await db.transaction(async (tx) => {
    const [prompt] = await tx
      .insert(prompts)
      .values({
        workspaceId,
        domainId: body.domainId,
        projectId: body.projectId,
        folderId: body.folderId,
        title: body.title,
        description: body.description,
      })
      .returning();

    const [version] = await tx
      .insert(promptVersions)
      .values({
        promptId: prompt.id,
        workspaceId,
        version: 1,
        body: body.body,
        note: "Initial version",
        createdByUserId: userId,
      })
      .returning();

    const [withVersion] = await tx
      .update(prompts)
      .set({ currentVersionId: version.id })
      .where(eq(prompts.id, prompt.id))
      .returning();

    if (body.tags && body.tags.length > 0) {
      await tx.insert(promptTags).values(
        [...new Set(body.tags)].map((tag) => ({ promptId: prompt.id, workspaceId, tag })),
      );
    }

    if (body.variables && body.variables.length > 0) {
      await tx.insert(promptVariables).values(
        body.variables.map((v) => ({
          promptId: prompt.id,
          workspaceId,
          name: v.name,
          defaultValue: v.defaultValue,
          description: v.description,
        })),
      );
    }

    return withVersion;
  });

  await recordActivity({
    workspaceId,
    userId,
    type: "prompt.created",
    title: `Created prompt "${created.title}"`,
    meta: { promptId: created.id },
  });

  const response = await buildPromptResponse(userId, created);
  return c.json(response, 201);
});

// GET /api/prompts/:id
promptsRouter.get("/:id", async (c) => {
  const workspaceId = c.get("workspaceId");
  const userId = c.get("userId");
  const prompt = await getOwnedPrompt(workspaceId, c.req.param("id"));
  return c.json(await buildPromptResponse(userId, prompt));
});

// PATCH /api/prompts/:id — metadata, move, tags, favorite, archive/restore.
// Prompt BODY is intentionally not editable here: bodies live in immutable
// versions (POST /api/prompts/:id/versions).
promptsRouter.patch("/:id", async (c) => {
  const workspaceId = c.get("workspaceId");
  const userId = c.get("userId");
  const id = c.req.param("id");
  const body = updatePromptRequestSchema.parse(await c.req.json());

  let updated = await getOwnedPrompt(workspaceId, id);
  await assertOwnedRefs(workspaceId, body);

  const columnUpdates = {
    ...(body.title !== undefined ? { title: body.title } : {}),
    ...(body.description !== undefined ? { description: body.description } : {}),
    ...(body.notes !== undefined ? { notes: body.notes } : {}),
    ...(body.domainId !== undefined ? { domainId: body.domainId } : {}),
    ...(body.projectId !== undefined ? { projectId: body.projectId } : {}),
    ...(body.folderId !== undefined ? { folderId: body.folderId } : {}),
    ...(body.archived !== undefined ? { archivedAt: body.archived ? new Date() : null } : {}),
  };

  // Tag-only or favorite-only patches touch other tables; drizzle rejects
  // an empty .set({}), so only update the prompts row when needed.
  if (Object.keys(columnUpdates).length > 0) {
    const [row] = await db
      .update(prompts)
      .set(columnUpdates)
      .where(and(eq(prompts.id, id), eq(prompts.workspaceId, workspaceId)))
      .returning();
    if (!row) throw new AppError(404, "not_found", "Prompt not found");
    updated = row;
  }

  // Tags: replace the whole set with what the client sent.
  if (body.tags !== undefined) {
    await db.delete(promptTags).where(eq(promptTags.promptId, id));
    if (body.tags.length > 0) {
      await db.insert(promptTags).values(
        [...new Set(body.tags)].map((tag) => ({ promptId: id, workspaceId, tag })),
      );
    }
  }

  // Favorite: per-user row in the favorites table.
  if (body.favorite !== undefined) {
    if (body.favorite) {
      await db
        .insert(favorites)
        .values({ workspaceId, userId, promptId: id })
        .onConflictDoNothing();
    } else {
      await db
        .delete(favorites)
        .where(and(eq(favorites.userId, userId), eq(favorites.promptId, id)));
    }
  }

  await recordActivity({
    workspaceId,
    userId,
    type: "prompt.updated",
    title: `Updated prompt "${updated.title}"`,
    meta: { promptId: updated.id },
  });

  return c.json(await buildPromptResponse(userId, updated));
});

// DELETE /api/prompts/:id — permanent delete (versions/tags/attachments
// cascade). For a recoverable "archive", use PATCH { archived: true }.
promptsRouter.delete("/:id", async (c) => {
  const workspaceId = c.get("workspaceId");
  const id = c.req.param("id");

  const [deleted] = await db
    .delete(prompts)
    .where(and(eq(prompts.id, id), eq(prompts.workspaceId, workspaceId)))
    .returning();
  if (!deleted) throw new AppError(404, "not_found", "Prompt not found");

  return c.json({ deleted: true });
});

// ---------------------------------------------------------------------------
// Versions (the Timeline). Versions are immutable: we only ever INSERT here.
// ---------------------------------------------------------------------------

// GET /api/prompts/:id/versions — newest first.
promptsRouter.get("/:id/versions", async (c) => {
  const workspaceId = c.get("workspaceId");
  const prompt = await getOwnedPrompt(workspaceId, c.req.param("id"));

  const rows = await db.query.promptVersions.findMany({
    where: (v, { eq }) => eq(v.promptId, prompt.id),
    orderBy: (v, { desc }) => [desc(v.version)],
  });

  const response: ListPromptVersionsResponse = { versions: rows.map(toVersionDto) };
  return c.json(response);
});

/** Insert the next version (max + 1) and point currentVersionId at it. */
async function appendVersion(
  prompt: PromptRow,
  userId: string,
  input: { body: string; note?: string | null; modelHint?: string | null },
): Promise<VersionRow> {
  return db.transaction(async (tx) => {
    const latest = await tx.query.promptVersions.findFirst({
      where: (v, { eq }) => eq(v.promptId, prompt.id),
      orderBy: (v, { desc }) => [desc(v.version)],
    });

    const [version] = await tx
      .insert(promptVersions)
      .values({
        promptId: prompt.id,
        workspaceId: prompt.workspaceId,
        version: (latest?.version ?? 0) + 1,
        body: input.body,
        note: input.note,
        modelHint: input.modelHint,
        createdByUserId: userId,
      })
      .returning();

    // Also bumps updatedAt so the prompt rises in "recently updated" lists.
    await tx
      .update(prompts)
      .set({ currentVersionId: version.id })
      .where(eq(prompts.id, prompt.id));

    return version;
  });
}

// POST /api/prompts/:id/versions — save a new immutable snapshot.
promptsRouter.post("/:id/versions", async (c) => {
  const workspaceId = c.get("workspaceId");
  const userId = c.get("userId");
  const prompt = await getOwnedPrompt(workspaceId, c.req.param("id"));
  const body = createPromptVersionRequestSchema.parse(await c.req.json());

  const version = await appendVersion(prompt, userId, body);

  await recordActivity({
    workspaceId,
    userId,
    type: "prompt.version_created",
    title: `Saved v${version.version} of "${prompt.title}"`,
    meta: { promptId: prompt.id, versionId: version.id, version: version.version },
  });

  const response: PromptVersionResponse = { version: toVersionDto(version) };
  return c.json(response, 201);
});

// GET /api/prompts/:id/versions/:versionId
promptsRouter.get("/:id/versions/:versionId", async (c) => {
  const workspaceId = c.get("workspaceId");
  const prompt = await getOwnedPrompt(workspaceId, c.req.param("id"));

  const version = await db.query.promptVersions.findFirst({
    where: (v, { and, eq }) =>
      and(eq(v.id, c.req.param("versionId")), eq(v.promptId, prompt.id)),
  });
  if (!version) throw new AppError(404, "not_found", "Version not found");

  const response: PromptVersionResponse = { version: toVersionDto(version) };
  return c.json(response);
});

// POST /api/prompts/:id/restore/:versionId — rollback WITHOUT rewriting
// history: copies the old snapshot into a brand-new version at the top.
promptsRouter.post("/:id/restore/:versionId", async (c) => {
  const workspaceId = c.get("workspaceId");
  const userId = c.get("userId");
  const prompt = await getOwnedPrompt(workspaceId, c.req.param("id"));

  const source = await db.query.promptVersions.findFirst({
    where: (v, { and, eq }) =>
      and(eq(v.id, c.req.param("versionId")), eq(v.promptId, prompt.id)),
  });
  if (!source) throw new AppError(404, "not_found", "Version not found");

  const version = await appendVersion(prompt, userId, {
    body: source.body,
    note: `Restored from v${source.version}`,
    modelHint: source.modelHint,
  });

  await recordActivity({
    workspaceId,
    userId,
    type: "prompt.restored",
    title: `Restored "${prompt.title}" to v${source.version} (as v${version.version})`,
    meta: { promptId: prompt.id, fromVersionId: source.id, newVersionId: version.id },
  });

  const response: PromptVersionResponse = { version: toVersionDto(version) };
  return c.json(response, 201);
});
