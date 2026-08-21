import { Hono } from "hono";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { redis } from "../../redis/client";
import { requireAuth } from "../../middleware/auth";
import { AppError } from "../../middleware/app-error";
import { createWorkspaceApiKey } from "../../services/keys/api-keys";
import type { AppEnv } from "../../types";

/**
 * Device authorization flow for the `lf` terminal CLI.
 *
 *   POST /api/v1/auth/device  → { device_code, user_code, verification_uri, expires_in }
 *   POST /api/v1/auth/token   → poll with { device_code } → { access_token } or { error: "pending" }
 *   POST /api/v1/auth/approve → user approves in browser (session auth) → mints API key
 *
 * Device codes are stored in Redis with a 5-minute TTL.
 */

export const deviceAuthRouter = new Hono<AppEnv>();

const DEVICE_KEY = (code: string) => `lf:device:${code}`;
const DEVICE_TTL = 300; // 5 minutes

const deviceRequestSchema = z.object({
  client_id: z.string().default("layerflow-lf-cli"),
});

const tokenRequestSchema = z.object({
  device_code: z.string().min(1),
  grant_type: z.string().default("urn:ietf:params:oauth:grant-type:device_code"),
});

// POST /api/v1/auth/device — CLI requests a device code
deviceAuthRouter.post("/device", async (c) => {
  const body = deviceRequestSchema.parse(await c.req.json().catch(() => ({})));

  const deviceCode = randomBytes(32).toString("hex");
  const userCode = randomBytes(3).toString("hex").toUpperCase();

  const verificationUri = `${c.req.header("origin") ?? ""}/settings/devices`;

  await redis.set(
    DEVICE_KEY(deviceCode),
    JSON.stringify({
      userCode,
      clientId: body.client_id,
      status: "pending",
      workspaceId: null,
      apiKeySecret: null,
    }),
    "EX",
    DEVICE_TTL,
  );

  return c.json({
    device_code: deviceCode,
    user_code: userCode,
    verification_uri: verificationUri,
    verification_uri_complete: `${verificationUri}?code=${userCode}`,
    expires_in: DEVICE_TTL,
    interval: 5,
  });
});

// POST /api/v1/auth/token — CLI polls for the token
deviceAuthRouter.post("/token", async (c) => {
  const body = tokenRequestSchema.parse(await c.req.json());

  const raw = await redis.get(DEVICE_KEY(body.device_code));
  if (!raw) {
    return c.json({ error: "expired", error_description: "Device code expired or not found" }, 400);
  }

  const data = JSON.parse(raw) as {
    userCode: string;
    status: string;
    apiKeySecret: string | null;
  };

  if (data.status === "approved" && data.apiKeySecret) {
    await redis.del(DEVICE_KEY(body.device_code));
    return c.json({
      access_token: data.apiKeySecret,
      token_type: "Bearer",
      expires_in: 0, // API keys don't expire
    });
  }

  if (data.status === "denied") {
    await redis.del(DEVICE_KEY(body.device_code));
    return c.json({ error: "access_denied", error_description: "User denied the request" }, 403);
  }

  return c.json({ error: "authorization_pending", error_description: "User has not yet approved" }, 400);
});

// POST /api/v1/auth/approve — user approves in the browser (session auth)
const approveSchema = z.object({
  device_code: z.string().min(1),
  action: z.enum(["approve", "deny"]),
});

deviceAuthRouter.post("/approve", requireAuth, async (c) => {
  const body = approveSchema.parse(await c.req.json());
  const workspaceId = c.get("workspaceId");

  const raw = await redis.get(DEVICE_KEY(body.device_code));
  if (!raw) {
    throw new AppError(404, "not_found", "Device code not found or expired");
  }

  const data = JSON.parse(raw) as { userCode: string; status: string; apiKeySecret: string | null };

  if (body.action === "deny") {
    await redis.set(
      DEVICE_KEY(body.device_code),
      JSON.stringify({ ...data, status: "denied" }),
      "EX",
      DEVICE_TTL,
    );
    return c.json({ status: "denied" });
  }

  // Approve: mint a workspace API key and store the secret for the CLI to pick up.
  const { secret } = await createWorkspaceApiKey(workspaceId, {
    name: `lf-cli-${data.userCode.toLowerCase()}`,
  });

  await redis.set(
    DEVICE_KEY(body.device_code),
    JSON.stringify({ ...data, status: "approved", apiKeySecret: secret }),
    "EX",
    DEVICE_TTL,
  );

  return c.json({ status: "approved" });
});

// GET /api/v1/auth/devices — list pending device codes (for the settings page)
deviceAuthRouter.get("/devices", requireAuth, async (c) => {
  const keys = await redis.keys("lf:device:*");
  const devices: Array<{ user_code: string; status: string; created: string }> = [];

  for (const key of keys) {
    const raw = await redis.get(key);
    if (!raw) continue;
    const data = JSON.parse(raw) as { userCode: string; status: string };
    devices.push({
      user_code: data.userCode,
      status: data.status,
      created: new Date().toISOString(),
    });
  }

  return c.json({ devices });
});
