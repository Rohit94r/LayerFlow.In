import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import {
  analyzePromptRequestSchema,
  recommendRequestSchema,
  routeRequestSchema,
  type AnalyzePromptResponse,
  type RecommendResponse,
  type RouteResponse,
  type RoutingRuleConfig,
} from "@layerflow/contracts";
import { db } from "../../db/client";
import {
  modelRecommendations,
  promptAnalyses,
  routingRules,
  workspaceSettings,
} from "../../db/schema/intelligence";
import { promptVersions } from "../../db/schema/prompts";
import { analyzePrompt } from "../../services/intelligence/analyze";
import { recommend } from "../../services/intelligence/recommend";
import { routeModel } from "../../services/intelligence/route";
import { requireAuth } from "../../middleware/auth";
import { AppError } from "../../middleware/app-error";
import type { AppEnv } from "../../types";

export const intelligenceRouter = new Hono<AppEnv>();

intelligenceRouter.use(requireAuth);

async function resolveContent(
  workspaceId: string,
  content: string | undefined,
  promptVersionId: string | undefined,
): Promise<{ content: string; promptVersionId: string | null }> {
  if (content) return { content, promptVersionId: promptVersionId ?? null };
  if (!promptVersionId) {
    throw new AppError(400, "validation_error", "content or promptVersionId is required");
  }
  const version = await db.query.promptVersions.findFirst({
    where: and(
      eq(promptVersions.id, promptVersionId),
      eq(promptVersions.workspaceId, workspaceId),
    ),
  });
  if (!version) throw new AppError(404, "not_found", "Prompt version not found");
  return { content: version.body, promptVersionId: version.id };
}

async function loadWorkspaceContext(workspaceId: string) {
  const settings = await db.query.workspaceSettings.findFirst({
    where: eq(workspaceSettings.workspaceId, workspaceId),
  });
  const rules = await db.query.routingRules.findMany({
    where: eq(routingRules.workspaceId, workspaceId),
  });
  return {
    settings: settings ?? {
      executionMode: "suggest" as const,
      preferCheap: false,
      tokenSaver: false,
      defaultModel: "gpt-4o-mini",
    },
    rules: rules.map((r) => ({
      id: r.id,
      condition: r.condition,
      conditionConfig: r.conditionConfig as RoutingRuleConfig | null,
      targetModel: r.targetModel,
      priority: r.priority,
      enabled: r.enabled,
    })),
  };
}

// POST /api/intelligence/analyze
intelligenceRouter.post("/analyze", async (c) => {
  const workspaceId = c.get("workspaceId");
  const body = analyzePromptRequestSchema.parse(await c.req.json());
  const resolved = await resolveContent(workspaceId, body.content, body.promptVersionId);

  const analysis = analyzePrompt(resolved.content, body.currentModel);

  if (body.persist && resolved.promptVersionId) {
    await db.insert(promptAnalyses).values({
      workspaceId,
      promptVersionId: resolved.promptVersionId,
      taskType: analysis.taskType,
      complexity: analysis.complexity,
      estimatedInputTokens: analysis.estimatedTokensIn,
      estimatedOutputTokens: analysis.estimatedTokensOut,
      estimatedCostMicro: analysis.estimatedCostMicro,
      details: {
        why: analysis.why,
        recommended: analysis.recommended,
        alternative: analysis.alternative,
      },
    });
  }

  const response: AnalyzePromptResponse = { analysis };
  return c.json(response);
});

// POST /api/intelligence/recommend
intelligenceRouter.post("/recommend", async (c) => {
  const workspaceId = c.get("workspaceId");
  const body = recommendRequestSchema.parse(await c.req.json());
  const resolved = await resolveContent(workspaceId, body.content, body.promptVersionId);
  const { settings, rules } = await loadWorkspaceContext(workspaceId);

  const { recommendation, analysis } = recommend({
    content: resolved.content,
    currentModel: body.currentModel ?? settings.defaultModel,
    preferCheap: settings.preferCheap,
    executionMode: settings.executionMode,
    rules,
  });

  if (body.persist) {
    await db.insert(modelRecommendations).values({
      workspaceId,
      promptVersionId: resolved.promptVersionId,
      recommendedModel: recommendation.recommendedModel,
      alternativeModel: recommendation.alternativeModel ?? null,
      reason: recommendation.reason,
      source: recommendation.source,
    });
  }

  const response: RecommendResponse = { recommendation, analysis };
  return c.json(response);
});

// POST /api/intelligence/route
intelligenceRouter.post("/route", async (c) => {
  const workspaceId = c.get("workspaceId");
  const body = routeRequestSchema.parse(await c.req.json());
  const { settings, rules } = await loadWorkspaceContext(workspaceId);

  const routed = routeModel({
    content: body.content,
    requestedModel: body.requestedModel,
    executionMode: settings.executionMode,
    preferCheap: settings.preferCheap,
    defaultModel: settings.defaultModel,
    rules,
  });

  // Persist recommendation when Auto Mode actually picks.
  if (settings.executionMode.startsWith("auto-")) {
    await db.insert(modelRecommendations).values({
      workspaceId,
      recommendedModel: routed.model,
      reason: routed.explanation,
      source: routed.source === "rule" ? "rule" : "heuristic",
    });
  }

  const response: RouteResponse = routed;
  return c.json(response);
});
