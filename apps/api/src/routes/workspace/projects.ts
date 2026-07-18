import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import {
  createProjectRequestSchema,
  listProjectsQuerySchema,
  updateProjectRequestSchema,
  type ListProjectsResponse,
  type Project,
  type ProjectResponse,
} from "@layerflow/contracts";
import { db } from "../../db/client";
import { projects } from "../../db/schema/workspace";
import { requireAuth } from "../../middleware/auth";
import { AppError } from "../../middleware/error";
import { recordActivity } from "../../services/workspace/activity";
import type { AppEnv } from "../../types";

export const projectsRouter = new Hono<AppEnv>();

projectsRouter.use(requireAuth);

function toProjectDto(row: typeof projects.$inferSelect): Project {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    domainId: row.domainId,
    name: row.name,
    description: row.description,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// GET /api/projects?domainId=&status=
projectsRouter.get("/", async (c) => {
  const workspaceId = c.get("workspaceId");
  const query = listProjectsQuerySchema.parse(c.req.query());

  const rows = await db.query.projects.findMany({
    where: (p, { and, eq }) =>
      and(
        eq(p.workspaceId, workspaceId),
        query.domainId ? eq(p.domainId, query.domainId) : undefined,
        query.status ? eq(p.status, query.status) : undefined,
      ),
    orderBy: (p, { desc }) => [desc(p.updatedAt)],
  });

  const response: ListProjectsResponse = { projects: rows.map(toProjectDto) };
  return c.json(response);
});

// POST /api/projects
projectsRouter.post("/", async (c) => {
  const workspaceId = c.get("workspaceId");
  const userId = c.get("userId");
  const body = createProjectRequestSchema.parse(await c.req.json());

  // The target domain must belong to this workspace.
  const domain = await db.query.domains.findFirst({
    where: (d, { and, eq }) => and(eq(d.id, body.domainId), eq(d.workspaceId, workspaceId)),
  });
  if (!domain) throw new AppError(404, "not_found", "Domain not found");

  const [created] = await db
    .insert(projects)
    .values({
      workspaceId,
      domainId: body.domainId,
      name: body.name,
      description: body.description,
    })
    .returning();

  await recordActivity({
    workspaceId,
    userId,
    type: "project.created",
    title: `Created project "${created.name}"`,
    meta: { projectId: created.id, domainId: created.domainId },
  });

  const response: ProjectResponse = { project: toProjectDto(created) };
  return c.json(response, 201);
});

// PATCH /api/projects/:id — rename, edit description, archive/restore.
projectsRouter.patch("/:id", async (c) => {
  const workspaceId = c.get("workspaceId");
  const userId = c.get("userId");
  const id = c.req.param("id");
  const body = updateProjectRequestSchema.parse(await c.req.json());

  const [updated] = await db
    .update(projects)
    .set({
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
    })
    .where(and(eq(projects.id, id), eq(projects.workspaceId, workspaceId)))
    .returning();
  if (!updated) throw new AppError(404, "not_found", "Project not found");

  await recordActivity({
    workspaceId,
    userId,
    type: "project.updated",
    title: `Updated project "${updated.name}"`,
    meta: { projectId: updated.id, status: updated.status },
  });

  const response: ProjectResponse = { project: toProjectDto(updated) };
  return c.json(response);
});

// DELETE /api/projects/:id — hard delete. Folders cascade away; prompts
// survive with projectId set to null (see FK definitions in the schema).
// Prefer PATCH { status: "archived" } when the work should be recoverable.
projectsRouter.delete("/:id", async (c) => {
  const workspaceId = c.get("workspaceId");
  const id = c.req.param("id");

  const [deleted] = await db
    .delete(projects)
    .where(and(eq(projects.id, id), eq(projects.workspaceId, workspaceId)))
    .returning();
  if (!deleted) throw new AppError(404, "not_found", "Project not found");

  return c.json({ deleted: true });
});
