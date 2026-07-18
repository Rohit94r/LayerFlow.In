import { Hono } from "hono";
import {
  listActivityQuerySchema,
  type ActivityEvent,
  type ListActivityResponse,
} from "@layerflow/contracts";
import { db } from "../../db/client";
import { activityEvents } from "../../db/schema/workspace";
import { requireAuth } from "../../middleware/auth";
import type { AppEnv } from "../../types";

export const activityRouter = new Hono<AppEnv>();

activityRouter.use(requireAuth);

function toActivityDto(row: typeof activityEvents.$inferSelect): ActivityEvent {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    userId: row.userId,
    type: row.type,
    title: row.title,
    description: row.description,
    meta: (row.meta as Record<string, unknown> | null) ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

// GET /api/activity — newest first.
activityRouter.get("/", async (c) => {
  const workspaceId = c.get("workspaceId");
  const query = listActivityQuerySchema.parse(c.req.query());

  const rows = await db.query.activityEvents.findMany({
    where: (a, { eq }) => eq(a.workspaceId, workspaceId),
    orderBy: (a, { desc }) => [desc(a.createdAt)],
    limit: query.limit,
    offset: query.offset,
  });

  const response: ListActivityResponse = { events: rows.map(toActivityDto) };
  return c.json(response);
});
