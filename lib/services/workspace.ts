// ─────────────────────────────────────────────────────────────
// Workspace service — repository-style API for projects,
// timeline, learning memory and dashboard stats.
//
// The current implementation is backed by static mock data
// (lib/data/workspace.ts). To move to the live Hono API,
// replace the bodies with the typed calls in lib/api/index.ts
// (listProjects, listActivity, …) — signatures stay identical.
// ─────────────────────────────────────────────────────────────

import {
  PROJECTS,
  PROJECT_BY_ID,
  TIMELINE,
  LEARNINGS,
  DASHBOARD_STATS,
  COST_ANALYTICS,
} from "@/lib/data/workspace";
import type { Project, TimelineEvent, Learning, DashboardStats, CostAnalytics } from "@/lib/types";

export interface WorkspaceService {
  listProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | null>;
  listTimeline(): Promise<TimelineEvent[]>;
  listLearnings(): Promise<Learning[]>;
  getDashboardStats(): Promise<DashboardStats>;
  getCostAnalytics(): Promise<CostAnalytics>;
}

export const workspaceService: WorkspaceService = {
  async listProjects() {
    return PROJECTS;
  },

  async getProject(id) {
    return PROJECT_BY_ID[id] ?? null;
  },

  async listTimeline() {
    return TIMELINE;
  },

  async listLearnings() {
    return LEARNINGS;
  },

  async getDashboardStats() {
    return DASHBOARD_STATS;
  },

  async getCostAnalytics() {
    return COST_ANALYTICS;
  },
};
