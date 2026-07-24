import { z } from "zod";
import { idSchema, microDollarsSchema, timestampSchema } from "./common";

/** Budget period key, e.g. "2026-07". */
export const budgetPeriodSchema = z.string().regex(/^\d{4}-\d{2}$/);

export const budgetSchema = z.object({
  id: idSchema,
  workspaceId: idSchema,
  period: budgetPeriodSchema,
  monthlyLimitMicro: microDollarsSchema,
  dailyLimitMicro: microDollarsSchema.nullish(),
  spentMicro: microDollarsSchema,
  /** Percentage (0-100) at which we send a warning alert. */
  alertAtPct: z.number().int().min(1).max(100),
  hardBlock: z.boolean(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export type Budget = z.infer<typeof budgetSchema>;

/** GET /api/budgets/current — includes derived fields the UI renders. */
export const currentBudgetResponseSchema = z.object({
  budget: budgetSchema,
  remainingMicro: microDollarsSchema,
  percentUsed: z.number().min(0),
  blocked: z.boolean(),
  /** Daily spent (Redis live when available, else ledger). */
  dailySpentMicro: microDollarsSchema.optional(),
  dailyRemainingMicro: microDollarsSchema.nullable().optional(),
});

export type CurrentBudgetResponse = z.infer<typeof currentBudgetResponseSchema>;

/** PUT /api/budgets/current */
export const updateBudgetRequestSchema = z.object({
  monthlyLimitMicro: microDollarsSchema,
  dailyLimitMicro: microDollarsSchema.nullable().optional(),
  alertAtPct: z.number().int().min(1).max(100).optional(),
  hardBlock: z.boolean().optional(),
});

export type UpdateBudgetRequest = z.infer<typeof updateBudgetRequestSchema>;

export const updateBudgetResponseSchema = currentBudgetResponseSchema;
export type UpdateBudgetResponse = CurrentBudgetResponse;

export const budgetScopeTypeSchema = z.enum(["project", "api_key"]);
export type BudgetScopeType = z.infer<typeof budgetScopeTypeSchema>;

export const budgetScopeSchema = z.object({
  id: idSchema,
  budgetId: idSchema,
  workspaceId: idSchema,
  scopeType: budgetScopeTypeSchema,
  projectId: idSchema.nullish(),
  apiKeyId: idSchema.nullish(),
  limitMicro: microDollarsSchema,
  spentMicro: microDollarsSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export type BudgetScope = z.infer<typeof budgetScopeSchema>;

/** GET /api/budgets/scopes */
export const listBudgetScopesResponseSchema = z.object({
  scopes: z.array(budgetScopeSchema),
});

export type ListBudgetScopesResponse = z.infer<typeof listBudgetScopesResponseSchema>;

/** PUT /api/budgets/scopes — replace the full scope set for the current budget. */
export const updateBudgetScopesRequestSchema = z.object({
  scopes: z
    .array(
      z
        .object({
          scopeType: budgetScopeTypeSchema,
          projectId: idSchema.optional(),
          apiKeyId: idSchema.optional(),
          limitMicro: microDollarsSchema,
        })
        .superRefine((s, ctx) => {
          if (s.scopeType === "project" && !s.projectId) {
            ctx.addIssue({ code: "custom", message: "projectId required for project scope", path: ["projectId"] });
          }
          if (s.scopeType === "api_key" && !s.apiKeyId) {
            ctx.addIssue({ code: "custom", message: "apiKeyId required for api_key scope", path: ["apiKeyId"] });
          }
        }),
    )
    .max(50),
});

export type UpdateBudgetScopesRequest = z.infer<typeof updateBudgetScopesRequestSchema>;

export const updateBudgetScopesResponseSchema = listBudgetScopesResponseSchema;
export type UpdateBudgetScopesResponse = ListBudgetScopesResponse;

/** GET /api/usage/summary */
const daySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const usageSummaryQuerySchema = z.object({
  from: daySchema.optional(),
  to: daySchema.optional(),
  groupBy: z.enum(["day", "project", "model", "key"]).default("day"),
});

export type UsageSummaryQuery = z.infer<typeof usageSummaryQuerySchema>;

export const usageSummaryBucketSchema = z.object({
  day: z.string().nullable().optional(),
  projectId: idSchema.nullable().optional(),
  model: z.string().nullable().optional(),
  apiKeyId: idSchema.nullable().optional(),
  requests: z.number().int().nonnegative(),
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  costMicro: microDollarsSchema,
});

export type UsageSummaryBucket = z.infer<typeof usageSummaryBucketSchema>;

export const usageSummaryResponseSchema = z.object({
  buckets: z.array(usageSummaryBucketSchema),
  source: z.enum(["rollups", "ledger"]),
});

export type UsageSummaryResponse = z.infer<typeof usageSummaryResponseSchema>;

/** GET /api/usage/alerts */
export const usageAlertSchema = z.object({
  level: z.enum(["warning", "blocked"]),
  scope: z.enum(["workspace_monthly", "workspace_daily", "project", "api_key"]),
  percentUsed: z.number().min(0),
  spentMicro: microDollarsSchema,
  limitMicro: microDollarsSchema,
  message: z.string(),
});

export type UsageAlert = z.infer<typeof usageAlertSchema>;

export const usageAlertsResponseSchema = z.object({
  alerts: z.array(usageAlertSchema),
});

export type UsageAlertsResponse = z.infer<typeof usageAlertsResponseSchema>;

/** GET /api/savings */
export const savingsResponseSchema = z.object({
  period: budgetPeriodSchema,
  actualCostMicro: microDollarsSchema,
  optimizedCostMicro: microDollarsSchema,
  savedMicro: microDollarsSchema,
  /** Sum of per-run savings.tokensSaved this period (when available). */
  tokensSaved: z.number().int().nonnegative().optional(),
  source: z.enum(["insights", "computed", "runs"]),
});

export type SavingsResponse = z.infer<typeof savingsResponseSchema>;
