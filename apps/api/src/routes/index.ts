import type { Hono } from "hono";
import { gatewayRouter } from "../gateway/router";
import type { AppEnv } from "../types";
import { budgetsRouter } from "./budgets/budgets";
import { savingsRouter, usageRouter } from "./budgets/usage";
import { collectionsRouter } from "./community/collections";
import { promptCloneRouter } from "./community/clone";
import { followsRouter, profilesRouter } from "./community/profiles";
import { commentsRouter, likesRouter } from "./community/social";
import { compareRouter } from "./compare/compare";
import { filesRouter } from "./files/files";
import { intelligenceRouter } from "./intelligence/intelligence";
import { routingRulesRouter } from "./intelligence/routing-rules";
import { settingsRouter } from "./intelligence/settings";
import { apiKeysRouter } from "./keys/api-keys";
import { providerKeysRouter } from "./keys/provider-keys";
import { learningRouter } from "./learning/learning";
import { memoryRouter } from "./memory/memories";
import { notificationsRouter } from "./notifications/notifications";
import { promptsRouter } from "./prompts/prompts";
import { rescueRouter } from "./rescue/rescue";
import { improveRouter } from "./improve/improve";
import { agentsRouter } from "./agents/agents";
import { chatRouter } from "./chat/chat";
import { runsRouter } from "./runs/runs";
import { searchRouter, similarRouter } from "./search/search";
import { sessionsRouter } from "./sessions/sessions";
import { audioRouter } from "./audio/audio";
import { billingRouter } from "./billing/billing";
import { activityRouter } from "./workspace/activity";
import { domainsRouter } from "./workspace/domains";
import { foldersRouter } from "./workspace/folders";
import { projectsRouter } from "./workspace/projects";
import { workspacesRouter } from "./workspace/workspaces";
import { syncRouter } from "./sync/sync";
import { teamRouter } from "./team/team";
import { adminRouter } from "./admin/analytics";
import { deviceAuthRouter } from "./auth/device";

/**
 * Route registration. Add new feature routers here:
 *
 *   import { promptsRouter } from "./prompts/prompts";
 *   app.route("/api/prompts", promptsRouter);
 *
 * Sub-routers own their own middleware (requireAuth etc.).
 */
export function registerRoutes(app: Hono<AppEnv>): void {
  app.route("/api/admin", adminRouter);
  app.route("/api/workspaces", workspacesRouter);
  app.route("/api/domains", domainsRouter);
  app.route("/api/projects", projectsRouter);
  app.route("/api/folders", foldersRouter);
  app.route("/api/activity", activityRouter);
  app.route("/api/prompts", promptsRouter);
  app.route("/api/prompts", promptCloneRouter);
  app.route("/api/sessions", sessionsRouter);
  app.route("/api/files", filesRouter);
  app.route("/api/runs", runsRouter);
  app.route("/api/audio", audioRouter);
  app.route("/api/billing", billingRouter);
  app.route("/api/compare", compareRouter);
  app.route("/api/intelligence", intelligenceRouter);
  app.route("/api/workspace/settings", settingsRouter);
  app.route("/api/routing-rules", routingRulesRouter);

  // Budgets / usage / keys / gateway
  app.route("/api/budgets", budgetsRouter);
  app.route("/api/usage", usageRouter);
  app.route("/api/savings", savingsRouter);
  app.route("/api/keys", apiKeysRouter);
  app.route("/api/provider-keys", providerKeysRouter);
  app.route("/v1", gatewayRouter);

  // CLI sync protocol (also used by the web /terminal dashboard)
  app.route("/api/v1/sync", syncRouter);

  // CLI device authorization flow (lf login)
  app.route("/api/v1/auth", deviceAuthRouter);

  // Memory / search / learning / community
  app.route("/api/memory", memoryRouter);
  app.route("/api/search", searchRouter);
  app.route("/api/similar", similarRouter);
  app.route("/api/learning", learningRouter);
  app.route("/api/rescue", rescueRouter);
  app.route("/api/improve", improveRouter);
  app.route("/api/agents", agentsRouter);
  app.route("/api/chat", chatRouter);
  app.route("/api/collections", collectionsRouter);
  app.route("/api/profiles", profilesRouter);
  app.route("/api/follows", followsRouter);
  app.route("/api/likes", likesRouter);
  app.route("/api/comments", commentsRouter);
  app.route("/api/notifications", notificationsRouter);
  app.route("/api/team", teamRouter);
}
