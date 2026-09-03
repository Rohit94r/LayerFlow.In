/**
 * Agent Builder Routes
 *
 * Provides HTTP endpoints for the guided agent creation flow:
 * - POST /api/agents/builder — start a new builder session
 * - POST /api/agents/builder/:sessionId/step — advance a step
 * - GET /api/agents/builder/:sessionId — get current builder state
 */

import { Hono } from "hono";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth";
import { AppError } from "../../middleware/app-error";
import type { AppEnv } from "../../types";
import {
  createBuilderSession,
  getBuilderSession,
  updateBuilderGoal,
  generateAgentDraft,
  selectTools,
  selectModel,
  definePermissions,
  setLimits,
  saveAgentFromBuilder,
  type BuilderSession,
} from "../../services/agents/builder";

export const builderRouter = new Hono<AppEnv>();
builderRouter.use(requireAuth);

// POST /api/agents/builder — start a new builder session
builderRouter.post("/", async (c) => {
  const workspaceId = c.get("workspaceId");
  const userId = c.get("userId");

  const session = createBuilderSession(workspaceId, userId);
  return c.json({
    sessionId: session.id,
    step: session.step,
    goal: session.goal,
    draft: session.draft,
    createdAt: session.createdAt.toISOString(),
  }, 201);
});

// GET /api/agents/builder/:sessionId — get current builder state
builderRouter.get("/:sessionId", async (c) => {
  const sessionId = c.req.param("sessionId");
  const session = getBuilderSession(sessionId);
  if (!session) {
    throw new AppError(404, "not_found", "Builder session not found");
  }
  return c.json({
    sessionId: session.id,
    step: session.step,
    goal: session.goal,
    draft: session.draft,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
  });
});

// POST /api/agents/builder/:sessionId/step — advance a step
builderRouter.post("/:sessionId/step", async (c) => {
  const sessionId = c.req.param("sessionId");

  // First, validate the session exists and belongs to this user
  const session = getBuilderSession(sessionId);
  if (!session) {
    throw new AppError(404, "not_found", "Builder session not found");
  }

  // Validate workspace ownership: sessions are scoped to the current user's workspace
  const workspaceId = c.get("workspaceId");
  if (session.workspaceId !== workspaceId) {
    throw new AppError(403, "forbidden", "This builder session belongs to another workspace");
  }

  // Validate request body with Zod schema
  const stepSchema = z.object({
    step: z.enum(["goal", "ai_generate", "review_tools", "select_model", "define_permissions", "set_limits", "save"]),
    data: z.record(z.string(), z.unknown()).optional().default({}),
  });

  const parsed = stepSchema.parse(await c.req.json());
  const { step, data } = parsed as { step: string; data: Record<string, unknown> };

  switch (step) {
    case "goal": {
      if (!data?.goal) {
        throw new AppError(400, "validation", "goal is required");
      }
      const updated = updateBuilderGoal(sessionId, String(data.goal));
      if (!updated) throw new AppError(500, "internal", "Failed to update goal");
      return c.json({
        sessionId: updated.id,
        step: "ai_generate",
        goal: updated.goal,
        message: "Goal set. Generating draft agent configuration...",
      });
    }

    case "ai_generate": {
      const generated = await generateAgentDraft(sessionId);
      if (!generated) throw new AppError(400, "validation", "Set a goal before generating a draft");
      return c.json({
        sessionId: generated.id,
        step: generated.step,
        draft: generated.draft,
        message: "AI generated draft agent configuration. Review and select tools.",
      });
    }

    case "review_tools": {
      if (!data?.tools) {
        throw new AppError(400, "validation", "tools array is required");
      }
      const updated = selectTools(sessionId, data.tools as string[]);
      if (!updated) throw new AppError(500, "internal", "Failed to update tools");
      return c.json({
        sessionId: updated.id,
        step: updated.step,
        tools: updated.draft.tools,
        message: "Tools selected. Now choose a model.",
      });
    }

    case "select_model": {
      if (!data?.model) {
        throw new AppError(400, "validation", "model configuration is required");
      }
      const updated = selectModel(sessionId, data.model as { modelId: string; provider: string; temperature: number; maxTokens: number; autoSwitch: boolean });
      if (!updated) throw new AppError(500, "internal", "Failed to select model");
      return c.json({
        sessionId: updated.id,
        step: updated.step,
        model: updated.draft.model,
        message: "Model selected. Define permissions.",
      });
    }

    case "define_permissions": {
      if (!data?.permissions) {
        throw new AppError(400, "validation", "permissions object is required");
      }
      const updated = definePermissions(sessionId, data.permissions as Record<string, string>);
      if (!updated) throw new AppError(500, "internal", "Failed to set permissions");
      return c.json({
        sessionId: updated.id,
        step: updated.step,
        permissions: updated.draft.permissions,
        message: "Permissions set. Set limits.",
      });
    }

    case "set_limits": {
      const updated = setLimits(sessionId, Number(data?.maxIterations ?? 25), Number(data?.timeoutMs ?? 300_000));
      if (!updated) throw new AppError(500, "internal", "Failed to set limits");
      return c.json({
        sessionId: updated.id,
        step: updated.step,
        limits: {
          maxIterations: updated.draft.maxIterations,
          timeoutMs: updated.draft.timeoutMs,
        },
        message: "Limits configured. Ready to save.",
      });
    }

    case "save": {
      const userId = c.get("userId");
      const result = await saveAgentFromBuilder(sessionId, userId);
      if (!result) throw new AppError(400, "validation", "Cannot save in current step. Complete all steps first.");
      return c.json({
        agent: result.agent,
        message: `Agent "${result.agent.name}" created successfully.`,
      }, 201);
    }

    default:
      throw new AppError(400, "validation", `Unknown step: ${step}`);
  }
});

export type BuilderRouteSession = BuilderSession;