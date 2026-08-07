/**
 * Budget reservation seam for playground / compare runs.
 * Delegates to the budgets agent's Redis reserve/settle helpers.
 *
 * Import surface (owned by budgets agent):
 *   apps/api/src/budgets/enforce.ts — reserveBudget / settleBudget / releaseBudget
 */

import { AppError } from "../../middleware/app-error";
import {
  releaseBudget,
  reserveBudget,
  settleBudget,
} from "../budgets/enforce";

export interface BudgetReserveArgs {
  workspaceId: string;
  /** Estimated max cost in micro-dollars. */
  estimatedCostMicro: number;
  runId?: string;
  source?: string;
  projectId?: string | null;
  apiKeyId?: string | null;
}

export interface BudgetReserveResult {
  /** Opaque reservation token for settle/release. */
  reservationId: string | null;
  /** When true, the call must not proceed (hard block). */
  blocked: boolean;
  reason?: string;
}

export interface BudgetSettleArgs {
  workspaceId: string;
  reservationId: string | null;
  actualCostMicro: number;
  runId: string;
  provider: string;
  model: string;
  source: string;
  inputTokens?: number;
  outputTokens?: number;
}

/**
 * BUDGET_HOOK: reserve via apps/api/src/budgets/enforce.reserveBudget.
 */
export async function budgetReserve(args: BudgetReserveArgs): Promise<BudgetReserveResult> {
  try {
    const reservation = await reserveBudget({
      workspaceId: args.workspaceId,
      projectId: args.projectId,
      apiKeyId: args.apiKeyId,
      estimateMicro: Math.max(1, args.estimatedCostMicro),
    });
    return { reservationId: reservation.reservationId, blocked: false };
  } catch (err) {
    if (err instanceof AppError && err.code === "budget_exceeded") {
      return { reservationId: null, blocked: true, reason: err.message };
    }
    // Soft fallback when Redis is unavailable (503): allow the run so local
    // CI without Redis still exercises the provider path. Gateway hard-blocks.
    if (err instanceof AppError && err.code === "budget_unavailable") {
      return { reservationId: null, blocked: false, reason: err.message };
    }
    throw err;
  }
}

/**
 * BUDGET_HOOK: settle via apps/api/src/budgets/enforce.settleBudget.
 */
export async function budgetSettle(args: BudgetSettleArgs): Promise<void> {
  if (!args.reservationId) return;
  await settleBudget({
    reservationId: args.reservationId,
    actualMicro: args.actualCostMicro,
    provider: args.provider,
    model: args.model,
    source: args.source,
    inputTokens: args.inputTokens,
    outputTokens: args.outputTokens,
    runId: args.runId,
  });
}

/**
 * BUDGET_HOOK: release via apps/api/src/budgets/enforce.releaseBudget.
 */
export async function budgetRelease(args: {
  workspaceId: string;
  reservationId: string | null;
  runId?: string;
}): Promise<void> {
  if (!args.reservationId) return;
  await releaseBudget({ reservationId: args.reservationId });
}
