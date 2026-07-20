import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import {
  createDomainRequestSchema,
  updateDomainRequestSchema,
  type Domain,
  type DomainResponse,
  type ListDomainsResponse,
} from "@layerflow/contracts";
import { db } from "../../db/client";
import { createId } from "../../db/schema/_helpers";
import { domains } from "../../db/schema/workspace";
import { requireAuth } from "../../middleware/auth";
import { AppError } from "../../middleware/app-error";
import { recordActivity } from "../../services/workspace/activity";
import type { AppEnv } from "../../types";

export const domainsRouter = new Hono<AppEnv>();

domainsRouter.use(requireAuth);

function toDomainDto(row: typeof domains.$inferSelect): Domain {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    name: row.name,
    slug: row.slug,
    description: row.description,
    icon: row.icon,
    color: row.color,
    sortOrder: row.sortOrder,
    archivedAt: row.archivedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** "Content Marketing!" → "content-marketing" */
function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "domain"
  );
}

// GET /api/domains
domainsRouter.get("/", async (c) => {
  const workspaceId = c.get("workspaceId");

  const rows = await db.query.domains.findMany({
    where: (d, { eq }) => eq(d.workspaceId, workspaceId),
    orderBy: (d, { asc }) => [asc(d.sortOrder), asc(d.createdAt)],
  });

  const response: ListDomainsResponse = { domains: rows.map(toDomainDto) };
  return c.json(response);
});

// POST /api/domains
domainsRouter.post("/", async (c) => {
  const workspaceId = c.get("workspaceId");
  const userId = c.get("userId");
  const body = createDomainRequestSchema.parse(await c.req.json());

  // Slug must be unique per workspace; add a short random suffix on collision.
  let slug = slugify(body.name);
  const clash = await db.query.domains.findFirst({
    where: (d, { and, eq }) => and(eq(d.workspaceId, workspaceId), eq(d.slug, slug)),
  });
  if (clash) slug = `${slug}-${createId("x").slice(2, 8)}`;

  // New domains go to the end of the list.
  const existing = await db.query.domains.findMany({
    where: (d, { eq }) => eq(d.workspaceId, workspaceId),
    columns: { sortOrder: true },
  });
  const nextSortOrder = existing.reduce((max, d) => Math.max(max, d.sortOrder + 1), 0);

  const [created] = await db
    .insert(domains)
    .values({
      workspaceId,
      name: body.name,
      slug,
      description: body.description,
      icon: body.icon,
      color: body.color,
      sortOrder: nextSortOrder,
    })
    .returning();

  await recordActivity({
    workspaceId,
    userId,
    type: "domain.created",
    title: `Created domain "${created.name}"`,
    meta: { domainId: created.id },
  });

  const response: DomainResponse = { domain: toDomainDto(created) };
  return c.json(response, 201);
});

// PATCH /api/domains/:id
domainsRouter.patch("/:id", async (c) => {
  const workspaceId = c.get("workspaceId");
  const id = c.req.param("id");
  const body = updateDomainRequestSchema.parse(await c.req.json());

  const [updated] = await db
    .update(domains)
    .set({
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.icon !== undefined ? { icon: body.icon } : {}),
      ...(body.color !== undefined ? { color: body.color } : {}),
      ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
    })
    .where(and(eq(domains.id, id), eq(domains.workspaceId, workspaceId)))
    .returning();
  if (!updated) throw new AppError(404, "not_found", "Domain not found");

  const response: DomainResponse = { domain: toDomainDto(updated) };
  return c.json(response);
});

// DELETE /api/domains/:id — hard delete, but refused while projects still
// point at the domain (avoids surprise cascade deletes of whole projects).
domainsRouter.delete("/:id", async (c) => {
  const workspaceId = c.get("workspaceId");
  const id = c.req.param("id");

  const domain = await db.query.domains.findFirst({
    where: (d, { and, eq }) => and(eq(d.id, id), eq(d.workspaceId, workspaceId)),
  });
  if (!domain) throw new AppError(404, "not_found", "Domain not found");

  const projectInDomain = await db.query.projects.findFirst({
    where: (p, { and, eq }) => and(eq(p.domainId, id), eq(p.workspaceId, workspaceId)),
  });
  if (projectInDomain) {
    throw new AppError(
      409,
      "domain_not_empty",
      "This domain still has projects. Move or delete them first.",
    );
  }

  await db.delete(domains).where(and(eq(domains.id, id), eq(domains.workspaceId, workspaceId)));
  return c.json({ deleted: true });
});
