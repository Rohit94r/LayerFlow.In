import DodoPayments from "dodopayments";
import { desc, eq } from "drizzle-orm";
import { db } from "../../db/client";
import { billingEvents, subscriptions } from "../../db/schema";
import { AppError } from "../../middleware/app-error";
import { getEnv } from "../../config/env";
import { logger } from "../../config/logger";
import {
  BILLING_PLANS,
  PLAN_DESCRIPTIONS,
  PLAN_FEATURES,
  getBillingPlan,
  getPlanProductId,
  type BillingPlan,
  type BillingPlanId,
} from "./plans";

/** The unexported types above come straight off the SDK client instance so
 * they can never drift from the installed version. */
type DodoClient = InstanceType<typeof DodoPayments>;
type DodoWebhookEvent = ReturnType<DodoClient["webhooks"]["unwrap"]>;
type CheckoutSessionParams = NonNullable<Parameters<DodoClient["checkoutSessions"]["create"]>[0]>;

export interface CheckoutUser {
  id: string;
  email: string;
  name?: string;
}

export interface CheckoutResult {
  checkoutUrl: string;
  sessionId: string;
}

export interface SubscriptionStatusResult {
  plan: "free" | BillingPlanId;
  status: string;
  currentPeriodEnd: string | null;
  provider: "dodo" | null;
  providerSubscriptionId: string | null;
  active: boolean;
  /** Whether Dodo Payments is wired up (product IDs set in env). */
  configured: boolean;
}

/** A payment.succeeded event rendered as an invoice row. */
export interface BillingInvoice {
  id: string;
  date: string;
  amount: string;
  status: "paid";
}

export interface WebhookHandleResult {
  eventId: string;
  type: string;
  deduplicated: boolean;
}

/**
 * Lazily built Dodo Payments client (bearer token + webhook secret + mode).
 * Throws 503 "billing_not_configured" until DODO_PAYMENTS_API_KEY is set.
 */
export function getDodoClient(): DodoPayments {
  const env = getEnv();
  if (!env.DODO_PAYMENTS_API_KEY) {
    throw new AppError(503, "billing_not_configured", "Dodo Payments is not configured");
  }
  return new DodoPayments({
    bearerToken: env.DODO_PAYMENTS_API_KEY,
    environment: env.DODO_PAYMENTS_ENVIRONMENT,
    webhookKey: env.DODO_PAYMENTS_WEBHOOK_KEY,
  });
}

export function isBillingConfigured(): boolean {
  return Boolean(getEnv().DODO_PAYMENTS_API_KEY);
}

/**
 * Create a hosted Dodo checkout session for a subscription plan and hand the
 * checkout URL back to the browser. Access is only granted after the verified
 * webhook event fires — never from the browser redirect.
 */
export async function createCheckoutSession(
  workspaceId: string,
  planId: BillingPlanId,
  user: CheckoutUser,
): Promise<CheckoutResult> {
  const env = getEnv();
  if (!env.DODO_PAYMENTS_API_KEY) {
    throw new AppError(503, "billing_not_configured", "Dodo Payments is not configured");
  }

  const plan = getBillingPlan(planId);
  const productId = getPlanProductId(plan.id); // throws 503 if not wired up

  const client = getDodoClient();
  const returnUrl = (env.DODO_PAYMENTS_RETURN_URL ?? `${env.WEB_URL}/billing`).replace(/\/+$/, "");
  const body: CheckoutSessionParams = {
    product_cart: [{ product_id: productId, quantity: 1 }],
    customer: {
      email: user.email,
      name: user.name?.length ? user.name : undefined,
    },
    return_url: `${returnUrl}?status=success`,
    cancel_url: `${returnUrl}?status=cancelled`,
    billing_currency: env.DODO_BILLING_CURRENCY as CheckoutSessionParams["billing_currency"],
    metadata: { workspace_id: workspaceId, plan: plan.id },
    subscription_data:
      plan.trialPeriodDays != null ? { trial_period_days: plan.trialPeriodDays } : undefined,
  };
  const session = await client.checkoutSessions.create(body);

  if (!session.checkout_url) {
    throw new AppError(
      422,
      "checkout_failed",
      "Dodo returned no checkout URL. Confirm the product is a subscription product.",
    );
  }

  return { checkoutUrl: session.checkout_url, sessionId: session.session_id };
}

/** Current subscription for a workspace (free plan unless a paid one exists). */
export async function getCurrentSubscription(
  workspaceId: string,
): Promise<SubscriptionStatusResult> {
  const sub = await db.query.subscriptions.findFirst({
    where: (s, { eq }) => eq(s.workspaceId, workspaceId),
  });

  const configured = isBillingConfigured();

  if (!sub || sub.plan === "free") {
    return {
      plan: "free",
      status: "active",
      currentPeriodEnd: null,
      provider: null,
      providerSubscriptionId: null,
      active: false,
      configured,
    };
  }

  const active = sub.status === "active";
  return {
    plan: sub.plan,
    status: sub.status,
    currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
    provider: sub.dodoSubscriptionId ? "dodo" : null,
    providerSubscriptionId: sub.dodoSubscriptionId,
    active,
    configured,
  };
}

/** Paid plans with their feature bullets + descriptions, for the Billing page. */
export interface BillingPlanDisplay {
  id: BillingPlanId;
  name: string;
  priceLabel: string;
  description: string;
  features: string[];
  highlighted: boolean;
  trialPeriodDays?: number;
}

export function getBillingPlansDisplay(): BillingPlanDisplay[] {
  return BILLING_PLANS.map((p, i) => ({
    id: p.id,
    name: p.name,
    priceLabel: p.priceLabel,
    description: PLAN_DESCRIPTIONS[p.id],
    features: PLAN_FEATURES[p.id],
    highlighted: i === 0, // Starter is the most popular entry point
    trialPeriodDays: p.trialPeriodDays,
  }));
}

/** List invoices from processed payment.succeeded webhook events. */
export async function getBillingInvoices(workspaceId: string): Promise<BillingInvoice[]> {
  if (!isBillingConfigured()) return [];
  const rows = await db
    .select({
      eventId: billingEvents.eventId,
      type: billingEvents.type,
      workspaceId: billingEvents.workspaceId,
      payload: billingEvents.payload,
      processedAt: billingEvents.processedAt,
    })
    .from(billingEvents)
    .where(eq(billingEvents.type, "payment.succeeded"))
    .orderBy(desc(billingEvents.processedAt))
    .limit(50);

  const invoices: BillingInvoice[] = [];
  for (const r of rows) {
    if (r.workspaceId !== workspaceId) continue;
    const payload = r.payload as Record<string, unknown> | null;
    const amountMicro =
      typeof payload?.amount_available === "number"
        ? payload.amount_available
        : typeof payload?.amount === "number"
          ? payload.amount
          : null;
    if (amountMicro == null) continue;
    // Dodo amounts are in the minor currency unit (e.g. cents); prices are $5/$14.
    const dollars = amountMicro / 100;
    invoices.push({
      id: `INV-${r.processedAt.toISOString().slice(0, 10).replace(/-/g, "")}-${r.eventId.slice(0, 8)}`,
      date: r.processedAt.toISOString().slice(0, 10),
      amount: `$${dollars.toFixed(2)}`,
      status: "paid",
    });
  }
  return invoices;
}

/**
 * Verify and process an incoming Dodo webhook. Returns after ACKing; real
 * failures bubble up so Dodo retries the delivery.
 */
export async function handleWebhook(
  rawBody: string,
  headers: Record<string, string>,
): Promise<WebhookHandleResult> {
  const env = getEnv();
  const eventId = headers["webhook-id"] ?? "";
  if (!eventId) throw new AppError(400, "missing_webhook_id", "Missing webhook-id header");

  const client = getDodoClient();

  let event: DodoWebhookEvent;
  if (env.DODO_PAYMENTS_WEBHOOK_KEY) {
    try {
      event = client.webhooks.unwrap(rawBody, {
        headers: {
          "webhook-id": headers["webhook-id"] ?? "",
          "webhook-signature": headers["webhook-signature"] ?? "",
          "webhook-timestamp": headers["webhook-timestamp"] ?? "",
        },
      });
    } catch {
      throw new AppError(401, "invalid_signature", "Invalid Dodo webhook signature");
    }
  } else {
    // Webhooks are strictly verified everywhere except the local dev loop.
    // Test environments (vitest) skip verification explicitly via NODE_ENV=test.
    if (env.NODE_ENV !== "development") {
      throw new AppError(503, "billing_not_configured", "DODO_PAYMENTS_WEBHOOK_KEY is not set");
    }
    logger.warn({ eventId }, "webhook secret not configured — accepting unsigned event in dev");
    event = client.webhooks.unsafeUnwrap(rawBody);
  }

  const type = (event as { type?: string }).type ?? "unknown";

  // Idempotency: claim the event id first so concurrent Dodo retries can't
  // both pass the check-then-apply window (atomic via the primary key).
  const claimed = await db
    .insert(billingEvents)
    .values({
      eventId,
      type,
      workspaceId: resolveWorkspaceId(event),
      payload: JSON.parse(rawBody),
    })
    .onConflictDoNothing({ target: billingEvents.eventId })
    .returning({ eventId: billingEvents.eventId });
  if (claimed.length === 0) return { eventId, type, deduplicated: true };

  try {
    await applyWebhookEvent(event); // throws → 500 → Dodo retries
  } catch (err) {
    // Release the claim so a retry can re-apply the event.
    await db.delete(billingEvents).where(eq(billingEvents.eventId, eventId)).catch(() => {});
    throw err;
  }

  return { eventId, type, deduplicated: false };
}

/** Pull our workspace id out of the checkout metadata (best-effort). */
function resolveWorkspaceId(event: DodoWebhookEvent): string | null {
  const data = (event as unknown as { data?: { metadata?: Record<string, unknown> } }).data;
  const meta = data?.metadata;
  if (meta && typeof meta.workspace_id === "string") return meta.workspace_id;
  return null;
}

/**
 * Apply a verified event to our data. Subscription life-cycle events drive the
 * `subscriptions` row; payment events fulfill/refresh an account once paid.
 */
async function applyWebhookEvent(event: DodoWebhookEvent): Promise<void> {
  const type = (event as { type?: string }).type ?? "";
  const data = (event as unknown as { data?: Record<string, unknown> }).data ?? {};
  const metadata = (data.metadata as Record<string, unknown> | undefined) ?? {};
  const nextBillingDate = (data.next_billing_date as string | undefined) ?? null;
  const plan = (
    metadata.plan === "starter" || metadata.plan === "pro" || metadata.plan === "team"
      ? metadata.plan
      : undefined
  ) as BillingPlanId | undefined;

  const productId = (data.product_id as string | undefined) ?? null;

  const customerId = ((data.customer as { customer_id?: unknown } | undefined)?.customer_id ??
    null) as string | null;
  const subscriptionId = (data.subscription_id as string | undefined) ?? null;

  // One-time payments for subscription products also drive activation.
  if (type === "payment.succeeded") {
    const workspaceId = resolveWorkspaceId(event) ?? (await findWorkspaceByDodoId(customerId, subscriptionId));
    if (workspaceId) {
      await upsertSubscription({
        workspaceId,
        plan,
        productId,
        status: "active",
        dodoCustomerId: customerId,
        dodoSubscriptionId: subscriptionId,
        currentPeriodEnd: nextBillingDate ? new Date(nextBillingDate) : undefined,
      });
    }
    return;
  }

  // Subscription life-cycle events.
  const statusMap: Record<string, string> = {
    "subscription.active": "active",
    "subscription.renewed": "active",
    "subscription.plan_changed": "active",
    "subscription.on_hold": "on_hold",
    "subscription.cancelled": "cancelled",
    "subscription.expired": "expired",
    "subscription.failed": "failed",
  };
  const newStatus = statusMap[type];
  if (!newStatus) {
    logger.info({ type }, "ignored Dodo webhook event");
    return;
  }

  const workspaceId =
    resolveWorkspaceId(event) ?? (await findWorkspaceByDodoId(customerId, subscriptionId));
  if (!workspaceId) {
    logger.warn({ type, subscriptionId, customerId }, "Dodo webhook for unknown workspace — skipped");
    return;
  }

  await upsertSubscription({
    workspaceId,
    plan,
    productId,
    status: newStatus,
    dodoCustomerId: customerId,
    dodoSubscriptionId: subscriptionId,
    currentPeriodEnd: nextBillingDate ? new Date(nextBillingDate) : undefined,
  });
}

interface UpsertParams {
  workspaceId: string;
  plan?: BillingPlanId;
  productId?: string | null;
  status: string;
  dodoCustomerId: string | null;
  dodoSubscriptionId?: string | null;
  currentPeriodEnd?: Date;
}

/** Idempotent upsert of the single subscription row per workspace. */
async function upsertSubscription(p: UpsertParams): Promise<void> {
  const existing = await db.query.subscriptions.findFirst({
    where: (s, { eq }) => eq(s.workspaceId, p.workspaceId),
  });
  // Never downgrade an existing plan because an event lacked plan metadata —
  // preserve the current plan (or derive from the purchased product).
  const plan = p.plan ?? derivePlanFromProduct(p.productId ?? null) ?? existing?.plan ?? "starter";
  await db
    .insert(subscriptions)
    .values({
      workspaceId: p.workspaceId,
      plan,
      status: p.status,
      dodoCustomerId: p.dodoCustomerId,
      dodoSubscriptionId: p.dodoSubscriptionId ?? null,
      currentPeriodEnd: p.currentPeriodEnd ?? null,
    })
    .onConflictDoUpdate({
      target: subscriptions.workspaceId,
      set: {
        plan,
        status: p.status,
        dodoCustomerId: p.dodoCustomerId,
        dodoSubscriptionId: p.dodoSubscriptionId ?? null,
        currentPeriodEnd: p.currentPeriodEnd ?? null,
        updatedAt: new Date(),
      },
    });
}

/** Map a purchased product id back to a plan when event metadata is absent. */
function derivePlanFromProduct(productId: string | null): BillingPlanId | undefined {
  if (!productId || !getEnv().DODO_PRODUCT_STARTER || !getEnv().DODO_PRODUCT_PRO) return undefined;
  if (productId === getEnv().DODO_PRODUCT_STARTER) return "starter";
  if (productId === getEnv().DODO_PRODUCT_PRO) return "pro";
  return undefined;
}

/** Back-fill a workspace id by matching on provider customer / subscription ids. */
async function findWorkspaceByDodoId(
  customerId: string | null,
  subscriptionId: string | null,
): Promise<string | null> {
  if (!customerId && !subscriptionId) return null;
  const row = await db.query.subscriptions.findFirst({
    where: (s, { or }) =>
      or(
        customerId ? eq(s.dodoCustomerId, customerId) : undefined,
        subscriptionId ? eq(s.dodoSubscriptionId, subscriptionId) : undefined,
      ),
  });
  return row?.workspaceId ?? null;
}