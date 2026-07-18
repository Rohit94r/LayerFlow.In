import type { MiddlewareHandler } from "hono";
import { auth } from "../auth";
import { db } from "../db/client";
import { onboardNewUser } from "../services/onboarding";
import type { AppEnv } from "../types";
import { AppError } from "./error";

/**
 * Session guard for /api/* routes.
 * Resolves session → userId → active workspace membership and attaches
 * { userId, workspaceId } to the context. Returns 401 otherwise.
 *
 * Usage: router.use(requireAuth) or app.use("/api/things/*", requireAuth).
 */
export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    throw new AppError(401, "unauthorized", "Sign in required");
  }

  // Active workspace = oldest membership (the default workspace) for now;
  // a workspace switcher can override this later via a header or setting.
  const membership = await db.query.workspaceMembers.findFirst({
    where: (m, { eq }) => eq(m.userId, session.user.id),
    orderBy: (m, { asc }) => [asc(m.createdAt)],
  });

  // Self-heal: if the after-signup hook failed, onboard on first API call.
  const workspaceId = membership?.workspaceId ?? (await onboardNewUser(session.user));

  c.set("userId", session.user.id);
  c.set("workspaceId", workspaceId);
  await next();
};
