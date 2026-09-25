import { db } from "../db/client";
import { AppError } from "../middleware/app-error";
import { domains, projects } from "../db/schema/workspace";

/**
 * `x-lf-project: <ref>` header support.
 *
 * The header value is a project REF, resolved in order:
 *   1. exact project id  (proj_…)
 *   2. project with the same name in this workspace (first match)
 *   3. auto-created under the workspace's "Gateway clients" domain, so
 *      per-project cost attribution works with zero setup.
 *
 * Returns null when the ref is empty/whitespace. Throws 400 when the ref is
 * a project id that belongs to a different workspace (never silently tags the
 * wrong workspace's project).
 */
export async function resolveGatewayProject(
  workspaceId: string,
  ref: string,
): Promise<string | null> {
  const name = ref.trim().slice(0, 80);
  if (!name) return null;

  if (name.startsWith("proj_")) {
    const project = await db.query.projects.findFirst({
      where: (p, { and, eq }) => and(eq(p.id, name), eq(p.workspaceId, workspaceId)),
    });
    if (project) return project.id;
    // A project id that isn't ours — explicit, so don't auto-create.
    throw new AppError(404, "project_not_found", `Project "${ref}" not found in this workspace`);
  }

  const existing = await db.query.projects.findFirst({
    where: (p, { and, eq }) => and(eq(p.name, name), eq(p.workspaceId, workspaceId)),
    orderBy: (p, { asc }) => [asc(p.createdAt)],
  });
  if (existing) return existing.id;

  let domain = await db.query.domains.findFirst({
    where: (d, { and, eq }) => and(eq(d.workspaceId, workspaceId), eq(d.slug, "gateway-clients")),
  });
  if (!domain) {
    const [created] = await db
      .insert(domains)
      .values({ workspaceId, name: "Gateway clients", slug: "gateway-clients", sortOrder: 0 })
      .returning();
    domain = created;
  }

  const [created] = await db
    .insert(projects)
    .values({ workspaceId, domainId: domain.id, name })
    .returning();
  return created.id;
}