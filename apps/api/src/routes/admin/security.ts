import { Hono } from "hono";
import { requireAuth } from "../../middleware/auth";
import { requireAdminEmail } from "../../middleware/admin";
import { listAuditLogs } from "../../services/audit/log";
import { rotateProviderKeys } from "../../services/keys/provider-keys";
import type { AppEnv } from "../../types";

export const adminSecurityRouter = new Hono<AppEnv>();
adminSecurityRouter.use(requireAuth);
adminSecurityRouter.use(requireAdminEmail);

// GET /api/admin/security/audit?limit=100&workspaceId=...
adminSecurityRouter.get("/security/audit", async (c) => {
  const limit = Number(c.req.query("limit") ?? 100);
  const workspaceId = c.req.query("workspaceId") ?? undefined;
  return c.json({ logs: await listAuditLogs({ limit, workspaceId }) });
});

// POST /api/admin/security/rotate-provider-keys  { newKekHex }
adminSecurityRouter.post("/security/rotate-provider-keys", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  if (!body || typeof body.newKekHex !== "string") {
    return c.json({ error: "missing newKekHex" }, 400);
  }
  const result = await rotateProviderKeys(body.newKekHex);
  return c.json(result);
});