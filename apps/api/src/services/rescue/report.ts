import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db/client";
import { rescueReports, type RescueReportRow } from "../../db/schema/rescue";
import { enqueue } from "../../jobs/queues";

/** Create a rescue report row (status "queued") and enqueue the worker job. */
export async function createRescueReport(input: {
  workspaceId: string;
  userId: string;
  content: string;
  sourceTool: string;
  targetModel?: string;
  projectId?: string;
  sessionId?: string;
}): Promise<RescueReportRow> {
  const words = input.content.trim().split(/\s+/).filter(Boolean).length;

  const [report] = await db
    .insert(rescueReports)
    .values({
      workspaceId: input.workspaceId,
      projectId: input.projectId ?? null,
      sessionId: input.sessionId ?? null,
      sourceTool: input.sourceTool,
      sourceModel: input.targetModel ?? "auto",
      originalWords: words,
    })
    .returning();

  await enqueue("rescue", {
    rescueId: report.id,
    workspaceId: input.workspaceId,
    userId: input.userId,
    content: input.content,
    targetModel: input.targetModel,
  });

  return report;
}

export async function getRescueReport(
  workspaceId: string,
  id: string,
): Promise<RescueReportRow | null> {
  const row = await db.query.rescueReports.findFirst({
    where: and(eq(rescueReports.id, id), eq(rescueReports.workspaceId, workspaceId)),
  });
  return row ?? null;
}

export async function updateRescueReport(
  workspaceId: string,
  id: string,
  input: { saved?: boolean; projectId?: string | null },
): Promise<RescueReportRow | null> {
  const [row] = await db
    .update(rescueReports)
    .set({
      ...(input.saved !== undefined ? { saved: input.saved ? 1 : 0 } : {}),
      ...(input.projectId !== undefined ? { projectId: input.projectId } : {}),
    })
    .where(and(eq(rescueReports.id, id), eq(rescueReports.workspaceId, workspaceId)))
    .returning();
  return row ?? null;
}

export async function listRescueReports(
  workspaceId: string,
  limit = 30,
  offset = 0,
): Promise<RescueReportRow[]> {
  return db.query.rescueReports.findMany({
    where: eq(rescueReports.workspaceId, workspaceId),
    orderBy: [desc(rescueReports.createdAt)],
    limit,
    offset,
  });
}
