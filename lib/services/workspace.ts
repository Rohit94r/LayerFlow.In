// ─────────────────────────────────────────────────────────────
// Workspace service — repository-style API for projects,
// timeline, learning memory and dashboard stats.
//
// Live Hono API: apps/api/src/routes (projects, activity,
// budgets/usage, savings, memory). Signatures match the old
// mock-backed interface, so consumers are unchanged.
// ─────────────────────────────────────────────────────────────

import {
  createProjectRequestSchema,
  currentBudgetResponseSchema,
  listActivityResponseSchema,
  listDomainsResponseSchema,
  listMemoriesResponseSchema,
  listProjectsResponseSchema,
  projectResponseSchema,
  savingsResponseSchema,
  updateBudgetRequestSchema,
  updateBudgetResponseSchema,
  updateProjectRequestSchema,
  usageAlertsResponseSchema,
  usageSummaryResponseSchema,
  type CurrentBudgetResponse,
  type UsageAlert,
  type UsageSummaryBucket,
} from "@layerflow/contracts";
import type { z } from "zod";
import { apiFetch, getServerCookieHeader } from "@/lib/api/client";
import { microToUsd } from "@/lib/api/money";
import type { Domain } from "@/lib/api/types";
import type {
  CostAnalytics,
  CostPoint,
  DashboardStats,
  Learning,
  ModelSpend,
  Project,
  SavingsSummary,
  TimelineEvent,
  TimelineEventType,
} from "@/lib/types";

export interface WorkspaceService {
  listProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | null>;
  listDomains(): Promise<Domain[]>;
  createProject(input: { name: string; description?: string; domainId: string }): Promise<Project>;
  updateProject(
    id: string,
    patch: { name?: string; description?: string; status?: "active" | "archived" },
  ): Promise<Project>;
  listTimeline(): Promise<TimelineEvent[]>;
  listLearnings(): Promise<Learning[]>;
  getDashboardStats(): Promise<DashboardStats>;
  getCostAnalytics(): Promise<CostAnalytics>;
  getSavingsSummary(): Promise<SavingsSummary | null>;
  listUsageAlerts(): Promise<UsageAlert[]>;
  getCurrentBudget(): Promise<CurrentBudgetResponse | null>;
  updateBudget(input: { monthlyLimitMicro: number }): Promise<CurrentBudgetResponse>;
}

/** Fetches with the session cookie forwarded when running in RSC. */
async function authedFetch<T>(path: string, schema?: z.ZodType<T>): Promise<T> {
  const headers = await getServerCookieHeader();
  return apiFetch<T>(path, { ...(headers.Cookie ? { headers } : {}) }, schema);
}

function mapProject(project: {
  id: string;
  name: string;
  description?: string | null;
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
}): Project {
  const palette = ["#44edbc", "#38bdf8", "#f59e0b", "#f472b6", "#a78bfa", "#fb923c"];
  const color = palette[Math.abs(hash(project.id)) % palette.length];
  return {
    id: project.id,
    name: project.name,
    description: project.description ?? "",
    color,
    promptCount: 0,
    learningCount: 0,
    stage: project.status === "archived" ? "done" : "active",
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function mapTimelineEvent(event: {
  id: string;
  type: string;
  title: string;
  description?: string | null;
  meta?: Record<string, unknown> | null;
  createdAt: string;
}): TimelineEvent {
  const typeMap: Record<string, TimelineEventType> = {
    "prompt.created": "prompt",
    "prompt.updated": "prompt",
    "prompt.version_created": "prompt",
    "project.created": "decision",
    "project.updated": "decision",
    "compare.completed": "decision",
    "session.created": "rescue",
    "session.updated": "rescue",
    "budget.alert": "cost",
    "budget.updated": "cost",
    "cache.hit": "cost",
    "model.changed": "model",
    "learning.created": "learning",
  };
  const meta = event.meta ?? {};
  const projectId = typeof meta.projectId === "string" ? meta.projectId : undefined;
  const summary = typeof meta.summary === "string" ? meta.summary : undefined;
  return {
    id: event.id,
    type: typeMap[event.type] ?? "decision",
    title: event.title,
    description: event.description ?? "",
    timestamp: event.createdAt,
    meta: summary,
    projectId,
  };
}

function mapLearning(memory: {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  meta?: unknown;
}): Learning {
  return {
    id: memory.id,
    content: memory.body || memory.title,
    source: memory.title,
    tags: [],
    createdAt: memory.createdAt,
    pinned: false,
  };
}

const sumCost = (buckets: UsageSummaryBucket[]) => microToUsd(buckets.reduce((t, b) => t + b.costMicro, 0));
const sumRequests = (buckets: UsageSummaryBucket[]) => buckets.reduce((t, b) => t + b.requests, 0);

export const workspaceService: WorkspaceService = {
  async listProjects() {
    const res = await authedFetch("/api/projects", listProjectsResponseSchema);
    return res.projects.map(mapProject);
  },

  async getProject(id) {
    try {
      const res = await authedFetch(`/api/projects/${id}`, projectResponseSchema);
      return mapProject(res.project);
    } catch {
      return null;
    }
  },

  async listDomains() {
    const res = await authedFetch("/api/domains", listDomainsResponseSchema);
    return res.domains.map((d) => ({
      id: d.id,
      slug: d.slug,
      name: d.name,
      description: d.description ?? "",
      icon: d.icon ?? "Sparkles",
      color: d.color ?? "#44edbc",
      projectCount: 0,
      promptCount: 0,
    }));
  },

  async createProject(input) {
    const headers = await getServerCookieHeader();
    const res = await apiFetch(
      "/api/projects",
      {
        method: "POST",
        body: createProjectRequestSchema.parse(input),
        ...(headers.Cookie ? { headers } : {}),
      },
      projectResponseSchema,
    );
    return mapProject(res.project);
  },

  async updateProject(id, patch) {
    const headers = await getServerCookieHeader();
    const res = await apiFetch(
      `/api/projects/${id}`,
      {
        method: "PATCH",
        body: updateProjectRequestSchema.parse(patch),
        ...(headers.Cookie ? { headers } : {}),
      },
      projectResponseSchema,
    );
    return mapProject(res.project);
  },

  async listTimeline() {
    const res = await authedFetch("/api/activity?limit=100", listActivityResponseSchema);
    return res.events.map(mapTimelineEvent);
  },

  async listLearnings() {
    const res = await authedFetch("/api/memory", listMemoriesResponseSchema);
    return res.memories.map(mapLearning);
  },

  async getDashboardStats() {
    const fallback: DashboardStats = {
      todayUsage: 0,
      todayUsageDelta: 0,
      moneySaved: 0,
      moneySavedDelta: 0,
      contextsSaved: 0,
      contextsSavedDelta: 0,
      continuePacks: 0,
      continuePacksDelta: 0,
      weeklyUsage: [],
      weeklySavings: [],
      modelMix: [],
    };

    const [summary, savings, memories] = await Promise.all([
      authedFetch("/api/usage/summary?groupBy=day", usageSummaryResponseSchema),
      authedFetch("/api/savings", savingsResponseSchema),
      authedFetch("/api/memory", listMemoriesResponseSchema),
    ]);

    const days = [...summary.buckets].sort((a, b) => (a.day ?? "").localeCompare(b.day ?? ""));
    const today = days[days.length - 1];
    const yesterday = days[days.length - 2];
    const todayUsage = today ? microToUsd(today.costMicro) : 0;
    const yesterdayUsage = yesterday ? microToUsd(yesterday.costMicro) : 0;
    const todayUsageDelta = yesterdayUsage > 0 ? ((todayUsage - yesterdayUsage) / yesterdayUsage) * 100 : 0;

    const weeklyUsage: CostPoint[] = days.slice(-7).map((d) => ({
      label: (d.day ?? "").slice(5),
      value: microToUsd(d.costMicro),
    }));

    const modelMix = new Map<string, number>();
    const byModel = await authedFetch("/api/usage/summary?groupBy=model", usageSummaryResponseSchema).catch(
      () => null,
    );
    for (const b of byModel?.buckets ?? []) {
      if (!b.model) continue;
      modelMix.set(b.model, (modelMix.get(b.model) ?? 0) + microToUsd(b.costMicro));
    }

    return {
      todayUsage,
      todayUsageDelta,
      moneySaved: microToUsd(savings.savedMicro),
      moneySavedDelta: 0,
      contextsSaved: memories.memories.length,
      contextsSavedDelta: 0,
      continuePacks: savings.tokensSaved ?? 0,
      continuePacksDelta: 0,
      weeklyUsage,
      weeklySavings: [],
      modelMix: [...modelMix.entries()].map(([provider, value]) => ({ provider, value })),
    };
  },

  async getCostAnalytics() {
    const [byDay, byModel, savings, budget] = await Promise.all([
      authedFetch("/api/usage/summary?groupBy=day", usageSummaryResponseSchema),
      authedFetch("/api/usage/summary?groupBy=model", usageSummaryResponseSchema),
      authedFetch("/api/savings", savingsResponseSchema),
      authedFetch("/api/budgets/current", currentBudgetResponseSchema).catch(() => null),
    ]);

    const totalCost = sumCost(byDay.buckets);
    const totalRequests = sumRequests(byDay.buckets);

    const days = [...byDay.buckets]
      .sort((a, b) => (a.day ?? "").localeCompare(b.day ?? ""))
      .slice(-7)
      .map((d) => microToUsd(d.costMicro));

    return {
      monthlySpend: totalCost,
      monthlySavings: microToUsd(savings.savedMicro),
      budgetLimit: budget ? microToUsd(budget.budget.monthlyLimitMicro) : 0,
      averageRunCost: totalRequests > 0 ? totalCost / totalRequests : 0,
      byModel: (byModel.buckets ?? [])
        .filter((b) => b.model)
        .map((b) => ({ label: b.model!, value: microToUsd(b.costMicro) })),
      savingsByMonth: [],
      dailySpend: days,
      spendByModel: (byModel.buckets ?? [])
        .filter((b) => b.model)
        .map((b) => ({
          modelId: b.model!,
          provider: b.model!,
          model: b.model!,
          spend: microToUsd(b.costMicro),
          runs: b.requests,
          tokensIn: b.inputTokens,
          tokensOut: b.outputTokens,
        })),
    };
  },

  async listUsageAlerts() {
    const res = await authedFetch("/api/usage/alerts", usageAlertsResponseSchema);
    return res.alerts;
  },

  async getSavingsSummary() {
    try {
      const res = await authedFetch("/api/savings", savingsResponseSchema);
      return {
        period: res.period,
        actualCost: microToUsd(res.actualCostMicro),
        optimizedCost: microToUsd(res.optimizedCostMicro),
        saved: microToUsd(res.savedMicro),
        tokensSaved: res.tokensSaved ?? 0,
        source: res.source,
      };
    } catch {
      return null;
    }
  },

  async getCurrentBudget() {
    try {
      return await authedFetch("/api/budgets/current", currentBudgetResponseSchema);
    } catch {
      return null;
    }
  },

  async updateBudget(input) {
    const headers = await getServerCookieHeader();
    return apiFetch(
      "/api/budgets/current",
      {
        method: "PUT",
        body: updateBudgetRequestSchema.parse(input),
        ...(headers.Cookie ? { headers } : {}),
      },
      updateBudgetResponseSchema,
    );
  },
};
