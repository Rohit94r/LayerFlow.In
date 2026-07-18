import type { MiddlewareHandler } from "hono";
import { findApiKeyBySecret, touchApiKeyLastUsed } from "../services/keys/api-keys";
import type { AppEnv } from "../types";
import { AppError } from "./error";

/**
 * Bearer API-key guard for /v1/* routes.
 * Expects: Authorization: Bearer lf_live_...
 */
export const requireApiKey: MiddlewareHandler<AppEnv> = async (c, next) => {
  const header = c.req.header("authorization") ?? c.req.header("Authorization");
  if (!header?.startsWith("Bearer ")) {
    throw new AppError(401, "unauthorized", "Missing or invalid Authorization Bearer token");
  }
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

  // Fire-and-forget last-used stamp
  void touchApiKeyLastUsed(key.id);

  await next();
};
