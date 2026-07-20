import { and, eq } from "drizzle-orm";
import type { BudgetScope, UpdateBudgetScopesRequest } from "@layerflow/contracts";
import { db } from "../../db/client";
import { budgetScopes } from "../../db/schema/cost";
import { AppError } from "../../middleware/app-error";
import { getOrCreateCurrentBudget } from "./current";

function toScopeDto(row: typeof budgetScopes.$inferSelect): BudgetScope {
  return {
    id: row.id,
    budgetId: row.budgetId,
    workspaceId: row.workspaceId,
    scopeType: row.scopeType,
    projectId: row.projectId,
    apiKeyId: row.apiKeyId,
    limitMicro: row.limitMicro,
    spentMicro: row.spentMicro,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listBudgetScopes(workspaceId: string): Promise<BudgetScope[]> {
  const budget = await getOrCreateCurrentBudget(workspaceId);
  const rows = await db.query.budgetScopes.findMany({
    where: (s, { and, eq }) => and(eq(s.workspaceId, workspaceId), eq(s.budgetId, budget.id)),
  });
  return rows.map(toScopeDto);
}

/** Replace all scopes for the current budget period. */
export async function replaceBudgetScopes(
  workspaceId: string,
  body: UpdateBudgetScopesRequest,
): Promise<BudgetScope[]> {
  const budget = await getOrCreateCurrentBudget(workspaceId);

  await db
    .delete(budgetScopes)
    .where(and(eq(budgetScopes.workspaceId, workspaceId), eq(budgetScopes.budgetId, budget.id)));

  if (body.scopes.length === 0) return [];

  const inserted = await db
    .insert(budgetScopes)
    .values(
      body.scopes.map((s) => ({
        budgetId: budget.id,
        workspaceId,
        scopeType: s.scopeType,
        projectId: s.scopeType === "project" ? s.projectId! : null,
        apiKeyId: s.scopeType === "api_key" ? s.apiKeyId! : null,
        limitMicro: s.limitMicro,
      })),
    )
    .returning();

  if (inserted.length !== body.scopes.length) {
    throw new AppError(500, "scope_write_failed", "Failed to write budget scopes");
  }
  return inserted.map(toScopeDto);
}
