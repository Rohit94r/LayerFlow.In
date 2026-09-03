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
  type AgentRow,
} from "../../db/schema/agents";
import { createId } from "../../db/schema/_helpers";
import { logger } from "../../config/logger";
import { AppError } from "../../middleware/app-error";
import type { AgentSpec, ModelPolicy, ToolPolicy } from "./spec";
import { defaultSpecForRole } from "./spec";
import type { AgentRole } from "@layerflow/contracts";

// -- Builder Steps -----------------------------------------------------------

export type BuilderStep =
  | "goal"
  | "ai_generate"
  | "review_tools"
  | "select_model"
  | "define_permissions"
  | "set_limits"
  | "save"
  | "deploy";

export interface BuilderSession {
  id: string;
  workspaceId: string;
  userId: string;
  step: BuilderStep;
  goal: string;
  draft: {
    name: string;
    description: string;
    role: AgentRole;
    systemPrompt: string;
    tools: string[];
    model: ModelPolicy;
    permissions: Record<string, string>;
    maxIterations: number;
    timeoutMs: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

// -- In-memory builder sessions (not persisted -- ephemeral per web session) --

const builderSessions = new Map<string, BuilderSession>();

export function createBuilderSession(
  workspaceId: string,
  userId: string,
): BuilderSession {
  const id = createId("bld");
  const session: BuilderSession = {
    id,
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
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  builderSessions.set(id, session);
  return session;
}

export function getBuilderSession(id: string): BuilderSession | null {
  return builderSessions.get(id) ?? null;
}

export function updateBuilderGoal(
  sessionId: string,
  goal: string,
): BuilderSession | null {
  const session = builderSessions.get(sessionId);
  if (!session) return null;
  session.goal = goal;
  session.updatedAt = new Date();
  return session;
}

// -- AI Draft Generation ----------------------------------------------------

/**
 * Generate a draft agent configuration from a user's goal description.
 * This calls an LLM to produce the initial config, which the user can then refine.
 */
export async function generateAgentDraft(
  sessionId: string,
): Promise<BuilderSession | null> {
  const session = builderSessions.get(sessionId);
  if (!session || !session.goal) return null;

  // In production, this would call an LLM with a structured output prompt.
  // The LLM would analyze the goal and produce a draft config.
  // For now, we generate a reasonable default based on goal keywords.
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

  const defaultSpec = defaultSpecForRole(role, session.workspaceId, generateName(goal));

  session.draft = {
    name: defaultSpec.name || generateName(goal),
    description: generateDescription(goal),
    role,
    systemPrompt: generateSystemPrompt(goal, role),
    tools: defaultSpec.tools.enabledTools,
    model: defaultSpec.model,
    permissions: defaultSpec.tools.permissions as Record<string, string>,
    maxIterations: defaultSpec.maxIterations,
    timeoutMs: defaultSpec.timeoutMs,
  };
  session.step = "review_tools";
  session.updatedAt = new Date();

  logger.info({ sessionId, role }, "agent draft generated");
  return session;
}

// -- Tool Selection ----------------------------------------------------------

export function selectTools(
  sessionId: string,
  tools: string[],
): BuilderSession | null {
  const session = builderSessions.get(sessionId);
  if (!session) return null;
  session.draft.tools = tools;
  session.step = "select_model";
  session.updatedAt = new Date();
  return session;
}

// -- Model Selection ---------------------------------------------------------

export function selectModel(
  sessionId: string,
  model: ModelPolicy,
): BuilderSession | null {
  const session = builderSessions.get(sessionId);
  if (!session) return null;
  session.draft.model = model;
  session.step = "define_permissions";
  session.updatedAt = new Date();
  return session;
}

// -- Permission Definition ---------------------------------------------------

export function definePermissions(
  sessionId: string,
  permissions: Record<string, string>,
): BuilderSession | null {
  const session = builderSessions.get(sessionId);
  if (!session) return null;
  session.draft.permissions = permissions;
  session.step = "set_limits";
  session.updatedAt = new Date();
  return session;
}

// -- Limit Setting ----------------------------------------------------------

export function setLimits(
  sessionId: string,
  maxIterations: number,
  timeoutMs: number,
): BuilderSession | null {
  const session = builderSessions.get(sessionId);
  if (!session) return null;
  session.draft.maxIterations = maxIterations;
  session.draft.timeoutMs = timeoutMs;
  session.step = "save";
  session.updatedAt = new Date();
  return session;
}

// -- Save & Deploy ----------------------------------------------------------

export async function saveAgentFromBuilder(
  sessionId: string,
  userId: string,
): Promise<{ agent: AgentRow } | null> {
  const session = builderSessions.get(sessionId);
  if (!session || session.step !== "save") return null;

  const { draft } = session;

  const [agent] = await db
    .insert(agents)
    .values({
      workspaceId: session.workspaceId,
      name: draft.name || "Unnamed agent",
      role: draft.role,
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
    await db.insert(agentPermissions).values({
      agentId: agent.id,
      workspaceId: session.workspaceId,
      key: toolKey,
      mode: mode as "allow_always" | "allow_once" | "deny",
      label: toolKey,
      description: "",
      category: "custom",
    }).onConflictDoNothing();
  }

  session.step = "deploy";
  session.updatedAt = new Date();

  logger.info({ agentId: agent.id, sessionId }, "agent created from builder");

  // Cleanup builder session.
  builderSessions.delete(sessionId);

  return { agent };
}

// -- Helpers -----------------------------------------------------------------

function generateName(goal: string): string {
  // Extract key words from the goal to create a short name.
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
