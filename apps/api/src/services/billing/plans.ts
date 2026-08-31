import { AppError } from "../../middleware/app-error";
import { getEnv } from "../../config/env";

/**
 * Paid plans billed through Dodo Payments. The `free` plan is not in this list —
 * there is nothing to charge for it.
 *
 * Each plan maps to a Dodo product id. Products are created in the dashboard
 * (app.dodopayments.com → Products → Add Product) and wired up via env vars so
 * prices / ids are easy to change without deployments.
 */
export type BillingPlanId = "starter" | "pro" | "team";

export interface BillingPlan {
  id: BillingPlanId;
  name: string;
  priceLabel: string;
  /** No card is charged for this many days (requires a Dodo subscription product). */
  trialPeriodDays?: number;
}

export const BILLING_PLANS: BillingPlan[] = [
  { id: "starter", name: "Starter", priceLabel: "$5/mo", trialPeriodDays: 14 },
  { id: "pro", name: "Pro", priceLabel: "$14/mo" },
  { id: "team", name: "Team", priceLabel: "Custom" },
];

/** Feature bullets shown on the Billing page for each paid plan. */
export const PLAN_FEATURES: Record<BillingPlanId, string[]> = {
  starter: [
    "Unlimited chat + auto model switching",
    "BYOK — encrypted provider keys",
    "AI Memory + context search",
    "Cost analytics + budgets",
    "3 workspaces",
  ],
  pro: [
    "Everything in Starter",
    "Autonomous agents + approvals",
    "Team workspaces (roles + invitations)",
    "Smart routing + model budgets",
    "CSV / JSON / PDF exports",
  ],
  team: [
    "Everything in Pro",
    "Unlimited seats",
    "Priority processing queue",
    "Early access: browser companion",
  ],
};

/** Human-friendly description per plan for the Billing page cards. */
export const PLAN_DESCRIPTIONS: Record<BillingPlanId, string> = {
  starter: "For solo builders who switch models weekly and never want to re-explain work.",
  pro: "For teams and heavy AI workflows with autonomous agents.",
  team: "For organizations needing unlimited seats and priority support.",
};

export function getBillingPlan(id: string): BillingPlan {
  const plan = BILLING_PLANS.find((p) => p.id === id);
  if (!plan) throw new AppError(400, "unknown_plan", `Unknown plan: ${id}`);
  return plan;
}

/** Dodo product id for a plan; throws 503 until the admin wires it up in env. */
export function getPlanProductId(plan: BillingPlanId | string): string {
  const env = getEnv();
  const ids: Record<BillingPlanId, string | undefined> = {
    starter: env.DODO_PRODUCT_STARTER,
    pro: env.DODO_PRODUCT_PRO,
    team: env.DODO_PRODUCT_TEAM,
  };
  const productId = ids[plan as BillingPlanId];
  if (!productId) {
    throw new AppError(
      503,
      "billing_not_configured",
      `Dodo product not configured for plan "${plan}" (set DODO_PRODUCT_${(
        plan as string
      ).toUpperCase()} in your API env)`,
    );
  }
  return productId;
}