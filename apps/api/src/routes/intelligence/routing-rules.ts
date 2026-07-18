import { and, asc, eq } from "drizzle-orm";
import { Hono } from "hono";
import {
  createRoutingRuleRequestSchema,
  updateRoutingRuleRequestSchema,
  type ListRoutingRulesResponse,
  type RoutingRule,
  type RoutingRuleConfig,
  type RoutingRuleResponse,
} from "@layerflow/contracts";
import { db } from "../../db/client";
import { routingRules } from "../../db/schema/intelligence";
import { requireAuth } from "../../middleware/auth";
import { AppError } from "../../middleware/error";
import type { AppEnv } from "../../types";

export const routingRulesRouter = new Hono<AppEnv>();

routingRulesRouter.use(requireAuth);

function toDto(row: typeof routingRules.$inferSelect): RoutingRule {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    condition: row.condition,
    conditionConfig: (row.conditionConfig as RoutingRuleConfig | null) ?? null,
    targetModel: row.targetModel,
    priority: row.priority,
    enabled: row.enabled,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// GET /api/routing-rules
routingRulesRouter.get("/", async (c) => {
  const workspaceId = c.get("workspaceId");
  const rows = await db.query.routingRules.findMany({
    where: eq(routingRules.workspaceId, workspaceId),
    orderBy: [asc(routingRules.priority)],
  });
  const response: ListRoutingRulesResponse = { rules: rows.map(toDto) };
  return c.json(response);
});

// POST /api/routing-rules
routingRulesRouter.post("/", async (c) => {
  const workspaceId = c.get("workspaceId");
  const body = createRoutingRuleRequestSchema.parse(await c.req.json());

  const [created] = await db
    .insert(routingRules)
    .values({
      workspaceId,
      condition: body.condition,
      conditionConfig: body.conditionConfig ?? null,
      targetModel: body.targetModel,
      priority: body.priority,
      enabled: body.enabled,
    })
    .returning();

  const response: RoutingRuleResponse = { rule: toDto(created) };
  return c.json(response, 201);
});

// PATCH /api/routing-rules/:id  (toggle / edit)
routingRulesRouter.patch("/:id", async (c) => {
  const workspaceId = c.get("workspaceId");
  const id = c.req.param("id");
  const body = updateRoutingRuleRequestSchema.parse(await c.req.json());

  const existing = await db.query.routingRules.findFirst({
    where: and(eq(routingRules.id, id), eq(routingRules.workspaceId, workspaceId)),
  });
  if (!existing) throw new AppError(404, "not_found", "Routing rule not found");

  const [updated] = await db
    .update(routingRules)
    .set({
      ...(body.condition !== undefined ? { condition: body.condition } : {}),
      ...(body.conditionConfig !== undefined ? { conditionConfig: body.conditionConfig } : {}),
      ...(body.targetModel !== undefined ? { targetModel: body.targetModel } : {}),
      ...(body.priority !== undefined ? { priority: body.priority } : {}),
      ...(body.enabled !== undefined ? { enabled: body.enabled } : {}),
    })
    .where(and(eq(routingRules.id, id), eq(routingRules.workspaceId, workspaceId)))
    .returning();

  const response: RoutingRuleResponse = { rule: toDto(updated) };
  return c.json(response);
});

// PUT /api/routing-rules/:id — same as PATCH (toggle convenience)
routingRulesRouter.put("/:id", async (c) => {
  // Reuse PATCH handler by cloning the request path — call the same logic inline.
  const workspaceId = c.get("workspaceId");
  const id = c.req.param("id");
  const body = updateRoutingRuleRequestSchema.parse(await c.req.json());

  const existing = await db.query.routingRules.findFirst({
    where: and(eq(routingRules.id, id), eq(routingRules.workspaceId, workspaceId)),
  });
  if (!existing) throw new AppError(404, "not_found", "Routing rule not found");

  const [updated] = await db
    .update(routingRules)
    .set({
      ...(body.condition !== undefined ? { condition: body.condition } : {}),
      ...(body.conditionConfig !== undefined ? { conditionConfig: body.conditionConfig } : {}),
      ...(body.targetModel !== undefined ? { targetModel: body.targetModel } : {}),
      ...(body.priority !== undefined ? { priority: body.priority } : {}),
      ...(body.enabled !== undefined ? { enabled: body.enabled } : {}),
    })
    .where(and(eq(routingRules.id, id), eq(routingRules.workspaceId, workspaceId)))
    .returning();

  return c.json({ rule: toDto(updated) } satisfies RoutingRuleResponse);
});

// DELETE /api/routing-rules/:id
routingRulesRouter.delete("/:id", async (c) => {
  const workspaceId = c.get("workspaceId");
  const id = c.req.param("id");

  const [deleted] = await db
    .delete(routingRules)
    .where(and(eq(routingRules.id, id), eq(routingRules.workspaceId, workspaceId)))
    .returning();
  if (!deleted) throw new AppError(404, "not_found", "Routing rule not found");

  return c.json({ ok: true });
});
