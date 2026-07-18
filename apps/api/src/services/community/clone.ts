import { and, eq, or } from "drizzle-orm";
import type { ClonePromptResponse } from "@layerflow/contracts";
import { db } from "../../db/client";
import { collectionItems, collections, promptClones } from "../../db/schema/community";
import { prompts, promptTags, promptVersions } from "../../db/schema/prompts";
import { AppError } from "../../middleware/error";
import { notify } from "./notifications";

/**
 * Clone a prompt into the caller's workspace.
 *
 * Source can be:
 * - a prompt already in the caller's workspace (personal fork), OR
 * - a prompt that sits in a public/unlisted collection (community clone).
 *
 * Copies title/description/notes + the current version body (+ tags).
 * Records attribution in prompt_clones and notifies the source workspace owner
 * when cloning across workspaces.
 */
export async function clonePrompt(
  workspaceId: string,
  userId: string,
  sourcePromptId: string,
): Promise<ClonePromptResponse> {
  const source = await db.query.prompts.findFirst({
    where: (p, { eq: e }) => e(p.id, sourcePromptId),
  });
  if (!source) throw new AppError(404, "not_found", "Prompt not found");

  const sameWorkspace = source.workspaceId === workspaceId;
  if (!sameWorkspace) {
    const visible = await db
      .select({ id: collections.id })
      .from(collectionItems)
      .innerJoin(collections, eq(collections.id, collectionItems.collectionId))
      .where(
        and(
          eq(collectionItems.promptId, sourcePromptId),
          or(eq(collections.visibility, "public"), eq(collections.visibility, "unlisted")),
        ),
      )
      .limit(1);
    if (visible.length === 0) {
      throw new AppError(403, "forbidden", "This prompt is not publicly cloneable");
    }
  }

  let body = "";
  let modelHint: string | null = null;
  if (source.currentVersionId) {
    const version = await db.query.promptVersions.findFirst({
      where: (v, { eq: e }) => e(v.id, source.currentVersionId!),
    });
    body = version?.body ?? "";
    modelHint = version?.modelHint ?? null;
  }
  if (!body) {
    throw new AppError(400, "validation_error", "Source prompt has no body to clone");
  }

  const tags = await db.query.promptTags.findMany({
    where: (t, { eq: e }) => e(t.promptId, source.id),
  });

  const cloned = await db.transaction(async (tx) => {
    const [prompt] = await tx
      .insert(prompts)
      .values({
        workspaceId,
        // Don't copy domain/project/folder — they belong to the source workspace.
        title: sameWorkspace ? `${source.title} (copy)` : source.title,
        description: source.description,
        notes: source.notes,
      })
      .returning();

    const [version] = await tx
      .insert(promptVersions)
      .values({
        promptId: prompt.id,
        workspaceId,
        version: 1,
        body,
        note: `Cloned from ${source.id}`,
        modelHint,
        createdByUserId: userId,
      })
      .returning();

    await tx
      .update(prompts)
      .set({ currentVersionId: version.id })
      .where(eq(prompts.id, prompt.id));

    if (tags.length > 0) {
      await tx.insert(promptTags).values(
        tags.map((t) => ({
          promptId: prompt.id,
          workspaceId,
          tag: t.tag,
        })),
      );
    }

    await tx.insert(promptClones).values({
      sourcePromptId: source.id,
      clonedPromptId: prompt.id,
      clonedByUserId: userId,
      workspaceId,
    });

    return { prompt, version };
  });

  if (!sameWorkspace) {
    const sourceWorkspace = await db.query.workspaces.findFirst({
      where: (w, { eq: e }) => e(w.id, source.workspaceId),
    });
    if (sourceWorkspace && sourceWorkspace.ownerUserId !== userId) {
      await notify({
        userId: sourceWorkspace.ownerUserId,
        type: "clone",
        title: "Your prompt was cloned",
        body: `"${source.title}" was cloned to another workspace`,
        data: {
          sourcePromptId: source.id,
          clonedPromptId: cloned.prompt.id,
          clonedByUserId: userId,
        },
      });
    }
  }

  return {
    prompt: {
      id: cloned.prompt.id,
      workspaceId: cloned.prompt.workspaceId,
      title: cloned.prompt.title,
      currentVersionId: cloned.version.id,
    },
    sourcePromptId: source.id,
  };
}
