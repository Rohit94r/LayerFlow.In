import DodoPayments from "dodopayments";
import { eq } from "drizzle-orm";
import { db } from "../../db/client";
import { billingEvents, subscriptions } from "../../db/schema";
import { AppError } from "../../middleware/app-error";
import { getEnv } from "../../config/env";
import { logger } from "../../config/logger";
import { getBillingPlan, getPlanProductId, type BillingPlanId } from "./plans";

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

  if (!sub || sub.plan === "free") {
    return {
      plan: "free",
      status: "active",
      currentPeriodEnd: null,
      provider: null,
      providerSubscriptionId: null,
      active: false,
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
  };
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
    // Webhooks are strictly verified in production. Without the secret we only
    // accept events in development so the flow stays testable end-to-end.
    if (env.NODE_ENV === "production") {
      throw new AppError(503, "billing_not_configured", "DODO_PAYMENTS_WEBHOOK_KEY is not set");
    }
    logger.warn({ eventId }, "webhook secret not configured — accepting unsigned event in dev");
    event = client.webhooks.unsafeUnwrap(rawBody);
  }

  const type = (event as { type?: string }).type ?? "unknown";

  // Idempotency: Dodo retries until we ACK, so skip already-applied events.
  const existing = await db.query.billingEvents.findFirst({
    where: (e, { eq }) => eq(e.eventId, eventId),
  });
  if (existing) return { eventId, type, deduplicated: true };

  const workspaceId = resolveWorkspaceId(event);
  await applyWebhookEvent(event); // throws → 500 → Dodo retries

  await db.insert(billingEvents).values({
    eventId,
    type,
    workspaceId: workspaceId ?? null,
    payload: JSON.parse(rawBody),
  });

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
    status: newStatus,
    dodoCustomerId: customerId,
    dodoSubscriptionId: subscriptionId,
    currentPeriodEnd: nextBillingDate ? new Date(nextBillingDate) : undefined,
  });
}

interface UpsertParams {
  workspaceId: string;
  plan?: BillingPlanId;
  status: string;
  dodoCustomerId: string | null;
  dodoSubscriptionId?: string | null;
  currentPeriodEnd?: Date;
}

/** Idempotent upsert of the single subscription row per workspace. */
async function upsertSubscription(p: UpsertParams): Promise<void> {
  const plan = p.plan ?? "starter";
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