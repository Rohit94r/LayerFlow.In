import type { MiddlewareHandler } from "hono";
import { auth } from "../auth";
import { db } from "../db/client";
import { findApiKeyBySecret, touchApiKeyLastUsed } from "../services/keys/api-keys";
import type { AppEnv } from "../types";
import { AppError } from "./app-error";
import { rateLimit } from "./rate-limit";

const SYNC_RPM = 1200;

/**
 * Auth guard for the CLI sync protocol (/api/v1/sync/*).
 *
 * Accepts either:
 *   - a session cookie (web dashboard), or
 *   - a workspace API key (Authorization: Bearer lf_live_...) for the CLI.
 *
 * Attaches { userId, workspaceId, apiKeyId } to the context. The CLI has no
 * session, so userId is empty for API-key traffic.
 */
export const requireSyncAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const header = c.req.header("authorization") ?? c.req.header("Authorization");

  if (header?.startsWith("Bearer ")) {
    const secret = header.slice("Bearer ".length).trim();
    if (!secret.startsWith("lf_live_")) {
      throw new AppError(401, "unauthorized", "Expected a LayerFlow API key (lf_live_…)");
    }
    const key = await findApiKeyBySecret(secret);
    if (!key) {
      throw new AppError(401, "unauthorized", "Invalid or revoked API key");
    }
    c.set("userId", "");
    c.set("workspaceId", key.workspaceId);
    c.set("apiKeyId", key.id);
    c.set("apiKeyProjectId", key.projectId);
    void touchApiKeyLastUsed(key.id);
  } else {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) {
      throw new AppError(401, "unauthorized", "Sign in required");
    }
    const membership = await db.query.workspaceMembers.findFirst({
      where: (m, { eq }) => eq(m.userId, session.user.id),
      orderBy: (m, { asc }) => [asc(m.createdAt)],
    });
    if (!membership) {
      throw new AppError(403, "forbidden", "No active workspace");
    }
    c.set("userId", session.user.id);
    c.set("workspaceId", membership.workspaceId);
  }

  await rateLimit({
    requestsPerMinute: SYNC_RPM,
    keyFn: (ctx) => String(ctx.get("workspaceId") ?? ""),
  })(c, next);
};
