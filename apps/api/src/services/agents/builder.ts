/**
 * Agent Builder Flow
 *
 * Full guided flow to create a new agent:
 * 1. "What do you want this agent to do?" -- User describes goal
 * 2. AI generates a draft config (name, description, role, system prompt)
 * 3. User reviews + selects tools
 * 4. User selects model
 * 5. User defines permissions
 * 6. User sets limits (budget, iterations, timeout)
 * 7. Save
 * 8. Deploy (or save as draft)
 */

import { db } from "../../db/client";
import {
  agents,
  agentPermissions,
  agentBuilderSessions,
  type AgentRow,
  type BuilderDraft,
  type BuilderStep,
  type AgentBuilderSessionRow,
} from "../../db/schema/agents";
import { createId } from "../../db/schema/_helpers";
import { logger } from "../../config/logger";
import { AppError } from "../../middleware/app-error";
import type { ModelPolicy } from "./spec";
import { defaultSpecForRole } from "./spec";
import type { AgentRole } from "@layerflow/contracts";
import { eq, and } from "drizzle-orm";

// -- DB-backed Builder Sessions -----------------------------------------------

export type { BuilderDraft, BuilderStep, AgentBuilderSessionRow };

export async function createBuilderSession(
  workspaceId: string,
  userId: string,
): Promise<AgentBuilderSessionRow> {
  const [row] = await db
    .insert(agentBuilderSessions)
    .values({
      workspaceId,
      userId,
      step: "goal",
      goal: "",
      draft: {
        name: "",
        description: "",
        role: "custom",
        systemPrompt: "",
        tools: [],
        model: {
          modelId: null,
          provider: null,
          temperature: 0.7,
          maxTokens: 2048,
          autoSwitch: true,
        },
        permissions: {},
        maxIterations: 25,
        timeoutMs: 300_000,
      },
    })
    .returning();

  logger.info({ sessionId: row.id, workspaceId }, "builder session created");
  return row;
}

export async function getBuilderSession(
  id: string,
  workspaceId: string,
): Promise<AgentBuilderSessionRow | null> {
  const row = await db.query.agentBuilderSessions.findFirst({
    where: and(
      eq(agentBuilderSessions.id, id),
      eq(agentBuilderSessions.workspaceId, workspaceId),
    ),
  });
  return row ?? null;
}

async function updateBuilderSession(
  id: string,
  patch: { goal?: string; step?: BuilderStep; draft?: BuilderDraft },
): Promise<AgentBuilderSessionRow> {
  const [row] = await db
    .update(agentBuilderSessions)
    .set({
      ...(patch.goal !== undefined ? { goal: patch.goal } : {}),
      ...(patch.step !== undefined ? { step: patch.step } : {}),
      ...(patch.draft !== undefined ? { draft: patch.draft } : {}),
      updatedAt: new Date(),
    })
    .where(eq(agentBuilderSessions.id, id))
    .returning();

  if (!row) throw new AppError(404, "not_found", "Builder session not found");
  return row;
}

export async function updateBuilderGoal(
  sessionId: string,
  goal: string,
): Promise<AgentBuilderSessionRow | null> {
  try {
    return await updateBuilderSession(sessionId, { goal });
  } catch {
    return null;
  }
}

// -- AI Draft Generation ----------------------------------------------------

/**
 * Generate a draft agent configuration from a user's goal description.
 * This calls an LLM to produce the initial config, which the user can then refine.
 */
export async function generateAgentDraft(
  sessionId: string,
  workspaceId: string,
): Promise<AgentBuilderSessionRow | null> {
  const session = await getBuilderSession(sessionId, workspaceId);
  if (!session || !session.goal) return null;

  const goal = session.goal.toLowerCase();

  let role: AgentRole = "custom";
  if (goal.includes("test") || goal.includes("qa") || goal.includes("quality")) {
    role = "test";
  } else if (goal.includes("review") || goal.includes("audit") || goal.includes("check")) {
    role = "review";
  } else if (goal.includes("research") || goal.includes("investigate") || goal.includes("find")) {
    role = "research";
  } else if (goal.includes("implement") || goal.includes("build") || goal.includes("create")) {
    role = "custom";
  } else if (goal.includes("job") || goal.includes("apply") || goal.includes("career")) {
    role = "job_apply";
  }

  const defaultSpec = defaultSpecForRole(role, workspaceId, generateName(goal));

  const draft: BuilderDraft = {
    name: defaultSpec.name || generateName(goal),
    description: generateDescription(goal),
    role,
    systemPrompt: generateSystemPrompt(goal, role),
    tools: defaultSpec.tools.enabledTools,
    model: {
      modelId: defaultSpec.model.modelId,
      provider: defaultSpec.model.provider,
      temperature: defaultSpec.model.temperature ?? 0.7,
      maxTokens: defaultSpec.model.maxTokens,
      autoSwitch: defaultSpec.model.autoSwitch,
    },
    permissions: defaultSpec.tools.permissions as Record<string, string>,
    maxIterations: defaultSpec.maxIterations,
    timeoutMs: defaultSpec.timeoutMs,
  };

  return updateBuilderSession(sessionId, { draft, step: "review_tools" });
}

// -- Tool Selection ----------------------------------------------------------

export async function selectTools(
  sessionId: string,
  workspaceId: string,
  tools: string[],
): Promise<AgentBuilderSessionRow | null> {
  const session = await getBuilderSession(sessionId, workspaceId);
  if (!session) return null;
  const draft = { ...session.draft, tools } as BuilderDraft;
  return updateBuilderSession(sessionId, { draft, step: "select_model" });
}

// -- Model Selection ---------------------------------------------------------

export async function selectModel(
  sessionId: string,
  workspaceId: string,
  model: ModelPolicy,
): Promise<AgentBuilderSessionRow | null> {
  const session = await getBuilderSession(sessionId, workspaceId);
  if (!session) return null;
  const draft = { ...session.draft, model } as BuilderDraft;
  return updateBuilderSession(sessionId, { draft, step: "define_permissions" });
}

// -- Permission Definition ---------------------------------------------------

export async function definePermissions(
  sessionId: string,
  workspaceId: string,
  permissions: Record<string, string>,
): Promise<AgentBuilderSessionRow | null> {
  const session = await getBuilderSession(sessionId, workspaceId);
  if (!session) return null;
  const draft = { ...session.draft, permissions } as BuilderDraft;
  return updateBuilderSession(sessionId, { draft, step: "set_limits" });
}

// -- Limit Setting ----------------------------------------------------------

export async function setLimits(
  sessionId: string,
  workspaceId: string,
  maxIterations: number,
  timeoutMs: number,
): Promise<AgentBuilderSessionRow | null> {
  const session = await getBuilderSession(sessionId, workspaceId);
  if (!session) return null;
  const draft = { ...session.draft, maxIterations, timeoutMs } as BuilderDraft;
  return updateBuilderSession(sessionId, { draft, step: "save" });
}

// -- Save & Deploy ----------------------------------------------------------

export async function saveAgentFromBuilder(
  sessionId: string,
  workspaceId: string,
): Promise<{ agent: AgentRow } | null> {
  const session = await getBuilderSession(sessionId, workspaceId);
  if (!session || session.step !== "save") return null;

  const draft = session.draft as BuilderDraft;

  const [agent] = await db
    .insert(agents)
    .values({
      workspaceId,
      name: draft.name || "Unnamed agent",
      role: draft.role as AgentRole,
      goal: session.goal,
      systemPrompt: draft.systemPrompt,
      modelId: draft.model.modelId,
      temperature: draft.model.temperature,
      status: "active",
      tools: draft.tools,
      onboarding: { builderSessionId: sessionId },
    })
    .returning();

  // Save per-tool permissions.
  for (const [toolKey, mode] of Object.entries(draft.permissions)) {
    await db
      .insert(agentPermissions)
      .values({
        agentId: agent.id,
        workspaceId,
        key: toolKey,
        mode: mode as "allow_always" | "allow_once" | "deny",
        label: toolKey,
        description: "",
        category: "custom",
      })
      .onConflictDoNothing();
  }

  // Mark as deployed.
  await updateBuilderSession(sessionId, { step: "deploy" });

  logger.info({ agentId: agent.id, sessionId }, "agent created from builder");

  return { agent };
}

// -- Helpers -----------------------------------------------------------------

function generateName(goal: string): string {
  const words = goal.split(/\s+/).filter((w) => w.length > 3).slice(0, 3);
  if (words.length === 0) return "Custom Agent";
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function generateDescription(goal: string): string {
  return goal.length > 120 ? goal.slice(0, 117) + "..." : goal;
}

function generateSystemPrompt(goal: string, role: AgentRole): string {
  const roleDescriptions: Record<AgentRole, string> = {
    implement: "You are a senior software engineer. Implement features, fix bugs, and write clean code.",
    review: "You are a code reviewer. Review code for quality, security, and best practices.",
    test: "You are a QA engineer. Write and run tests, verify functionality, and report issues.",
    custom: "You are a helpful AI agent. Complete the user's goal step by step.",
    job_apply: "You are a career assistant. Help find and apply for jobs.",
    internship_hunter: "You are an internship finder. Search and track internship opportunities.",
    linkedin_outreach: "You are a networking assistant. Help with LinkedIn outreach.",
    research: "You are a research assistant. Find, analyze, and summarize information.",
    scholarship: "You are a scholarship finder. Help find and apply for scholarships.",
    startup_research: "You are a startup research assistant. Find and analyze startups.",
    content_repurposing: "You are a content strategist. Repurpose content across platforms.",
    meeting_followup: "You are a meeting follow-up assistant. Draft follow-ups and summaries.",
  };

  return `${roleDescriptions[role] ?? roleDescriptions.custom}

Goal: ${goal}

Use your available tools to accomplish this goal. Always explain your plan before acting. Request approval before making changes.`;
}
