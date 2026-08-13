import type { MiddlewareHandler } from "hono";
import { auth } from "../auth";
import { db } from "../db/client";
import { onboardNewUser } from "../services/onboarding";
import type { AppEnv } from "../types";
import { AppError } from "./app-error";
import { rateLimit } from "./rate-limit";

/**
 * Default per-user ceiling for every authenticated /api/* request.
 * Route-specific limits (spend-heavy endpoints) may be stricter; this is the
 * last-resort global backstop so no endpoint is ever completely unthrottled.
 */
const DEFAULT_USER_RPM = 600;

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

  // Active workspace: a caller may select one explicitly with X-LF-Workspace;
  // otherwise it's the oldest membership (the default workspace). A workspace
  // switcher in the UI can set this header; unknown/foreign IDs are ignored.
  const requestedWorkspace = c.req.header("x-lf-workspace");
  const membership = requestedWorkspace
    ? await db.query.workspaceMembers.findFirst({
        where: (m, { and, eq }) =>
          and(eq(m.userId, session.user.id), eq(m.workspaceId, requestedWorkspace)),
      })
    : await db.query.workspaceMembers.findFirst({
        where: (m, { eq }) => eq(m.userId, session.user.id),
        orderBy: (m, { asc }) => [asc(m.createdAt)],
      });

  // Self-heal: if the after-signup hook failed, onboard on first API call.
  const workspaceId = membership?.workspaceId ?? (await onboardNewUser(session.user));

  c.set("userId", session.user.id);
  c.set("workspaceId", workspaceId);

  await rateLimit({
    requestsPerMinute: DEFAULT_USER_RPM,
    keyFn: (ctx) => String(ctx.get("userId") ?? ""),
  })(c, next);
};
