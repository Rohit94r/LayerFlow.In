import { eq } from "drizzle-orm";
import { Hono } from "hono";
import {
  updateWorkspaceRequestSchema,
  type CurrentWorkspaceResponse,
  type UpdateWorkspaceResponse,
  type Workspace,
} from "@layerflow/contracts";
import { db } from "../../db/client";
import { workspaces } from "../../db/schema/tenancy";
import { requireAuth } from "../../middleware/auth";
import { AppError } from "../../middleware/error";
import type { AppEnv } from "../../types";

/**
 * Reference route implementation — copy this pattern for new routes:
 * 1. new Hono<AppEnv>() sub-router, requireAuth for the whole router
 * 2. validate request bodies with @layerflow/contracts schemas (ZodError → 400)
 * 3. every query is scoped by c.get("workspaceId") — never trust IDs from the client
 * 4. respond with contracts response types
 */
export const workspacesRouter = new Hono<AppEnv>();

workspacesRouter.use(requireAuth);

function toWorkspaceDto(row: typeof workspaces.$inferSelect): Workspace {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    ownerUserId: row.ownerUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// GET /api/workspaces/current
workspacesRouter.get("/current", async (c) => {
  const workspaceId = c.get("workspaceId");
  const userId = c.get("userId");

  const workspace = await db.query.workspaces.findFirst({
    where: (w, { eq }) => eq(w.id, workspaceId),
  });
  if (!workspace) throw new AppError(404, "not_found", "Workspace not found");

  const membership = await db.query.workspaceMembers.findFirst({
    where: (m, { and, eq }) => and(eq(m.workspaceId, workspaceId), eq(m.userId, userId)),
  });

  const response: CurrentWorkspaceResponse = {
    workspace: toWorkspaceDto(workspace),
    role: membership?.role ?? "member",
  };
  return c.json(response);
});

// PATCH /api/workspaces/:id (rename)
workspacesRouter.patch("/:id", async (c) => {
  const workspaceId = c.get("workspaceId");
  const id = c.req.param("id");

  // Tenancy check: users can only touch their own active workspace.
  if (id !== workspaceId) {
    throw new AppError(403, "forbidden", "You do not have access to this workspace");
  }

  const body = updateWorkspaceRequestSchema.parse(await c.req.json());

  const [updated] = await db
    .update(workspaces)
    .set({ name: body.name })
    .where(eq(workspaces.id, workspaceId))
    .returning();
  if (!updated) throw new AppError(404, "not_found", "Workspace not found");

  const response: UpdateWorkspaceResponse = { workspace: toWorkspaceDto(updated) };
  return c.json(response);
});
