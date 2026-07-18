import { Hono } from "hono";
import {
  updateBudgetRequestSchema,
  updateBudgetScopesRequestSchema,
  type CurrentBudgetResponse,
  type ListBudgetScopesResponse,
  type UpdateBudgetScopesResponse,
} from "@layerflow/contracts";
import { requireAuth } from "../../middleware/auth";
import { buildCurrentBudgetResponse, updateCurrentBudget } from "../../services/budgets/current";
import { listBudgetScopes, replaceBudgetScopes } from "../../services/budgets/scopes";
import type { AppEnv } from "../../types";

export const budgetsRouter = new Hono<AppEnv>();
budgetsRouter.use(requireAuth);

// GET /api/budgets/current
budgetsRouter.get("/current", async (c) => {
  const response: CurrentBudgetResponse = await buildCurrentBudgetResponse(c.get("workspaceId"));
  return c.json(response);
});

// PUT /api/budgets/current
budgetsRouter.put("/current", async (c) => {
  const body = updateBudgetRequestSchema.parse(await c.req.json());
  const response = await updateCurrentBudget(c.get("workspaceId"), body);
  return c.json(response);
});

// GET /api/budgets/scopes
budgetsRouter.get("/scopes", async (c) => {
  const scopes = await listBudgetScopes(c.get("workspaceId"));
  const response: ListBudgetScopesResponse = { scopes };
  return c.json(response);
});

// PUT /api/budgets/scopes
budgetsRouter.put("/scopes", async (c) => {
  const body = updateBudgetScopesRequestSchema.parse(await c.req.json());
  const scopes = await replaceBudgetScopes(c.get("workspaceId"), body);
  const response: UpdateBudgetScopesResponse = { scopes };
  return c.json(response);
});
