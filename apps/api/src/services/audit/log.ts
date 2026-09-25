import { db } from "../../db/client";
import { auditLogs } from "../../db/schema/gateway";

export type AuditActorType = "user" | "system" | "api";

export interface AuditLogInput {
  workspaceId?: string;
  actorType: AuditActorType;
  actorId?: string;
  action: string;
  detail?: Record<string, unknown>;
}

/**
 * Append-only security audit. Best-effort by design: a failed audit row must
 * never break the request it describes, so writes swallow errors and callers
 * may `void` the promise in hot paths.
 */
export async function writeAuditLog(input: AuditLogInput): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      workspaceId: input.workspaceId ?? null,
      actorType: input.actorType,
      actorId: input.actorId ?? null,
      action: input.action,
      detail: input.detail ?? {},
    });
  } catch {
    // Audit is best-effort — never throw into the caller.
  }
}

export async function listAuditLogs(opts: {
  workspaceId?: string;
  limit?: number;
}): Promise<Array<{
  id: string;
  workspaceId: string | null;
  actorType: string;
  actorId: string | null;
  action: string;
  detail: Record<string, unknown>;
  createdAt: string;
}>> {
  const limit = Math.min(Math.max(opts.limit ?? 100, 1), 500);
  const rows = await db.query.auditLogs.findMany({
    where: (t, { and, eq }) =>
      opts.workspaceId ? and(eq(t.workspaceId, opts.workspaceId)) : undefined,
    orderBy: (t, { desc }) => [desc(t.createdAt)],
    limit,
  });
  return rows.map((r) => ({
    id: r.id,
    workspaceId: r.workspaceId,
    actorType: r.actorType,
    actorId: r.actorId,
    action: r.action,
    detail: r.detail,
    createdAt: r.createdAt.toISOString(),
  }));
}