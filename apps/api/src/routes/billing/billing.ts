import { Hono } from "hono";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth";
import { AppError } from "../../middleware/app-error";
import { db } from "../../db/client";
import {
  createCheckoutSession,
  getCurrentSubscription,
  handleWebhook,
  isBillingConfigured,
} from "../../services/billing/dodo";
import type { AppEnv } from "../../types";

const checkoutSchema = z.object({
  plan: z.enum(["starter", "pro", "team"]),
});

/**
 * Billing routes (Dodo Payments).
 *
 *   POST /api/billing/checkout — create a hosted checkout session (auth)
 *   GET  /api/billing/status   — current plan + subscription state (auth)
 *   POST /api/billing/webhook  — Dodo webhook receiver (signed, no auth)
 */
export const billingRouter = new Hono<AppEnv>();

billingRouter.get("/status", requireAuth, async (c) => {
  const status = await getCurrentSubscription(c.get("workspaceId"));
  return c.json({ status, configured: isBillingConfigured() });
});

billingRouter.post("/checkout", requireAuth, async (c) => {
  const { plan } = checkoutSchema.parse(await c.req.json());

  const user = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.id, c.get("userId")),
  });
  if (!user) throw new AppError(401, "unauthorized", "Sign in required");

  const session = await createCheckoutSession(c.get("workspaceId"), plan, {
    id: user.id,
    email: user.email,
    name: user.name,
  });
  return c.json({ checkout_url: session.checkoutUrl, session_id: session.sessionId });
});

billingRouter.post("/webhook", async (c) => {
  const rawBody = await c.req.text();
  const headers = {
    "webhook-id": c.req.header("webhook-id") ?? "",
    "webhook-signature": c.req.header("webhook-signature") ?? "",
    "webhook-timestamp": c.req.header("webhook-timestamp") ?? "",
  };
  await handleWebhook(rawBody, headers);
  return c.json({ received: true });
});