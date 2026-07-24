import { eq } from "drizzle-orm";
import { Hono } from "hono";
import {
  updateWorkspaceSettingsRequestSchema,
  type WorkspaceSettingsResponse,
} from "@layerflow/contracts";
import { db } from "../../db/client";
import { workspaceSettings } from "../../db/schema/intelligence";
import { requireAuth } from "../../middleware/auth";
import { AppError } from "../../middleware/app-error";
import type { AppEnv } from "../../types";

export const settingsRouter = new Hono<AppEnv>();

settingsRouter.use(requireAuth);

function toDto(row: typeof workspaceSettings.$inferSelect) {
  return {
    workspaceId: row.workspaceId,
    executionMode: row.executionMode,
    preferCheap: row.preferCheap,
    tokenSaver: row.tokenSaver,
    defaultModel: row.defaultModel,
    updatedAt: row.updatedAt.toISOString(),
  };
}

// GET /api/workspace/settings
settingsRouter.get("/", async (c) => {
  const workspaceId = c.get("workspaceId");
  let row = await db.query.workspaceSettings.findFirst({
    where: eq(workspaceSettings.workspaceId, workspaceId),
  });
  if (!row) {
    const [created] = await db
      .insert(workspaceSettings)
      .values({ workspaceId })
      .returning();
    row = created;
  }
  const response: WorkspaceSettingsResponse = { settings: toDto(row) };
  return c.json(response);
});

// PUT /api/workspace/settings
settingsRouter.put("/", async (c) => {
  const workspaceId = c.get("workspaceId");
  const body = updateWorkspaceSettingsRequestSchema.parse(await c.req.json());

  const existing = await db.query.workspaceSettings.findFirst({
    where: eq(workspaceSettings.workspaceId, workspaceId),
  });
  if (!existing) {
    const [created] = await db
      .insert(workspaceSettings)
      .values({
        workspaceId,
        executionMode: body.executionMode ?? "suggest",
        preferCheap: body.preferCheap ?? false,
        tokenSaver: body.tokenSaver ?? false,
        defaultModel: body.defaultModel ?? "gpt-4o-mini",
      })
      .returning();
    return c.json({ settings: toDto(created) } satisfies WorkspaceSettingsResponse);
  }

  const [updated] = await db
    .update(workspaceSettings)
    .set({
      ...(body.executionMode !== undefined ? { executionMode: body.executionMode } : {}),
      ...(body.preferCheap !== undefined ? { preferCheap: body.preferCheap } : {}),
      ...(body.tokenSaver !== undefined ? { tokenSaver: body.tokenSaver } : {}),
      ...(body.defaultModel !== undefined ? { defaultModel: body.defaultModel } : {}),
    })
    .where(eq(workspaceSettings.workspaceId, workspaceId))
    .returning();

  if (!updated) throw new AppError(404, "not_found", "Workspace settings not found");
  return c.json({ settings: toDto(updated) } satisfies WorkspaceSettingsResponse);
});
