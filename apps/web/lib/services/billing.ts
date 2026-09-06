// ─────────────────────────────────────────────────────────────
// Billing service — real Hono API calls for plans, subscription
// status, invoices, and checkout initiation.
// ─────────────────────────────────────────────────────────────

import { apiFetch, getServerCookieHeader } from "@/lib/api/client";

export interface BillingPlanDisplay {
  id: "starter" | "pro" | "team";
  name: string;
  priceLabel: string;
  description: string;
  features: string[];
  highlighted: boolean;
  trialPeriodDays?: number;
}

export interface SubscriptionStatus {
  plan: "free" | "starter" | "pro" | "team";
  status: string;
  currentPeriodEnd: string | null;
  provider: "dodo" | null;
  providerSubscriptionId: string | null;
  active: boolean;
  configured: boolean;
}

export interface BillingInvoice {
  id: string;
  date: string;
  amount: string;
  status: "paid";
}

export interface BillingStatus {
  plans: BillingPlanDisplay[];
  subscription: SubscriptionStatus;
  invoices: BillingInvoice[];
}

export const billingService = {
  async getStatus(): Promise<BillingStatus> {
    const headers = await getServerCookieHeader();
    const [plansRes, statusRes, invoicesRes] = await Promise.all([
      apiFetch<{ plans: BillingPlanDisplay[] }>(
        "/api/billing/plans",
        { ...(headers.Cookie ? { headers } : {}) },
      ),
      apiFetch<{ status: SubscriptionStatus; configured: boolean }>(
        "/api/billing/status",
        { ...(headers.Cookie ? { headers } : {}) },
      ),
      apiFetch<{ invoices: BillingInvoice[] }>(
        "/api/billing/invoices",
        { ...(headers.Cookie ? { headers } : {}) },
      ).catch(() => ({ invoices: [] })),
    ]);

    return {
      plans: plansRes.plans,
      subscription: { ...statusRes.status, configured: statusRes.configured },
      invoices: invoicesRes.invoices,
    };
  },

  async startCheckout(plan: "starter" | "pro" | "team"): Promise<{ checkout_url: string }> {
    const headers = await getServerCookieHeader();
    return apiFetch<{ checkout_url: string }>(
      "/api/billing/checkout",
      {
        method: "POST",
        body: { plan },
        ...(headers.Cookie ? { headers } : {}),
      },
    );
  },
};