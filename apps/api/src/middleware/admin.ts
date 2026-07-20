import type { MiddlewareHandler } from "hono";
import { auth } from "../auth";
import { isAdminEmail } from "../config/admin";
import type { AppEnv } from "../types";
import { AppError } from "./app-error";

/**
 * Email allowlist check. Mount after `requireAuth` so userId/workspaceId
 * are already on the context.
 */
export const requireAdminEmail: MiddlewareHandler<AppEnv> = async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    throw new AppError(401, "unauthorized", "Sign in required");
  }
  if (!isAdminEmail(session.user.email)) {
    throw new AppError(403, "forbidden", "Not authorized");
  }
  await next();
};
