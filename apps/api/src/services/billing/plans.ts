import { AppError } from "../../middleware/app-error";
import { getEnv } from "../../config/env";

/**
 * Paid plans billed through Dodo Payments. The `free` plan is not in this list —
 * there is nothing to charge for it.
 *
 * Pricing is deliberately simple: **Free ₹0 / Pro $9/mo**. One paid plan, one
 * Dodo product. Prices / ids are wired up via env vars so they can change
 * without deployments (test ₹ pricing uses a second product set during the
 * Dodo test-checkout run — flip DODO_BILLING_CURRENCY to test it).
 *
 * Each paid plan maps to a Dodo product id. Products are created in the
 * dashboard (app.dodopayments.com → Products → Add Product).
 */
export type BillingPlanId = "pro";

export interface BillingPlan {
  id: BillingPlanId;
  name: string;
  priceLabel: string;
}

export const BILLING_PLANS: BillingPlan[] = [
  { id: "pro", name: "Pro", priceLabel: "$9/mo" },
];

/** Feature bullets shown on the Billing page for the Pro plan. */
export const PLAN_FEATURES: Record<BillingPlanId, string[]> = {
  pro: [
    "Unlimited gateway requests (no demo cap)",
    "BYOK vault — provider keys + custom base URLs",
    "Per-project spend with a single header",
    "Hard budget caps + email alerts at 50/80/100%",
    "Usage history + CSV / JSON / PDF cost reports",
    "lf CLI direct mode + lf config",
    "Loose-key mode — keys never stored or logged",
  ],
};

/** Human-friendly blurb per plan for the Billing page cards. */
export const PLAN_DESCRIPTIONS: Record<BillingPlanId, string> = {
  pro: "For solo devs and freelancers who want real AI spend control without markup.",
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
    pro: env.DODO_PRODUCT_PRO,
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