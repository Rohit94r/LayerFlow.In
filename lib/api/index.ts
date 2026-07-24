import {
  currentWorkspaceResponseSchema,
  listDomainsResponseSchema,
  domainResponseSchema,
  listProjectsResponseSchema,
  projectResponseSchema,
  listFoldersResponseSchema,
  folderResponseSchema,
  listPromptsResponseSchema,
  promptResponseSchema,
  listPromptVersionsResponseSchema,
  promptVersionResponseSchema,
  listSessionsResponseSchema,
  sessionResponseSchema,
  sessionDetailResponseSchema,
  sessionMessageResponseSchema,
  currentBudgetResponseSchema,
  listBudgetScopesResponseSchema,
  listApiKeysResponseSchema,
  createApiKeyResponseSchema,
  deleteApiKeyResponseSchema,
  listProviderKeysResponseSchema,
  createProviderKeyResponseSchema,
  deleteProviderKeyResponseSchema,
  listRunsResponseSchema,
  runResponseSchema,
  createCompareResponseSchema,
  compareJobResponseSchema,
  analyzePromptResponseSchema,
  recommendResponseSchema,
  routeResponseSchema,
  workspaceSettingsResponseSchema,
  listRoutingRulesResponseSchema,
  routingRuleResponseSchema,
  listActivityResponseSchema,
  searchResponseSchema,
  usageSummaryResponseSchema,
  savingsResponseSchema,
  adminAnalyticsResponseSchema,
  createPromptRequestSchema,
  updatePromptRequestSchema,
  createPromptVersionRequestSchema,
  createPromptVariableRequestSchema,
  updatePromptVariableRequestSchema,
  promptVariableResponseSchema,
  createProjectRequestSchema,
  updateProjectRequestSchema,
  createFolderRequestSchema,
  createSessionRequestSchema,
  updateSessionRequestSchema,
  appendSessionMessageRequestSchema,
  updateBudgetRequestSchema,
  updateBudgetScopesRequestSchema,
  updateBudgetScopesResponseSchema,
  createApiKeyRequestSchema,
  createProviderKeyRequestSchema,
  createRunRequestSchema,
  createCompareRequestSchema,
  analyzePromptRequestSchema,
  recommendRequestSchema,
  routeRequestSchema,
  updateWorkspaceSettingsRequestSchema,
  createRoutingRuleRequestSchema,
  updateRoutingRuleRequestSchema,
  type CreatePromptRequest,
  type UpdatePromptRequest,
  type CreatePromptVersionRequest,
  type CreatePromptVariableRequest,
  type UpdatePromptVariableRequest,
  type CreateProjectRequest,
  type UpdateProjectRequest,
  type CreateFolderRequest,
  type CreateSessionRequest,
  type UpdateSessionRequest,
  type AppendSessionMessageRequest,
  type UpdateBudgetRequest,
  type UpdateBudgetScopesRequest,
  type CreateApiKeyRequest,
  type CreateProviderKeyRequest,
  type UpdateWorkspaceSettingsRequest,
  type CreateRoutingRuleRequest,
  type UpdateRoutingRuleRequest,
  type AdminAnalyticsResponse,
} from "@layerflow/contracts";
import type { z } from "zod";
import { apiFetch } from "./client";

type AnalyzePromptInput = z.input<typeof analyzePromptRequestSchema>;
type RecommendInput = z.input<typeof recommendRequestSchema>;
type RouteInput = z.input<typeof routeRequestSchema>;
type CreateRunInput = z.input<typeof createRunRequestSchema>;
type CreateCompareInput = z.input<typeof createCompareRequestSchema>;

// ── Workspace ──────────────────────────────────────────────

export function getCurrentWorkspace() {
  return apiFetch("/api/workspaces/current", {}, currentWorkspaceResponseSchema);
}

export function listDomains() {
  return apiFetch("/api/domains", {}, listDomainsResponseSchema);
}

export function createDomain(body: { name: string; description?: string; icon?: string; color?: string }) {
  return apiFetch("/api/domains", { method: "POST", body }, domainResponseSchema);
}

export function listProjects(query?: { domainId?: string; status?: string }) {
  return apiFetch("/api/projects", { query }, listProjectsResponseSchema);
}

export function createProject(body: CreateProjectRequest) {
  createProjectRequestSchema.parse(body);
  return apiFetch("/api/projects", { method: "POST", body }, projectResponseSchema);
}

export function updateProject(id: string, body: UpdateProjectRequest) {
  updateProjectRequestSchema.parse(body);
  return apiFetch(`/api/projects/${id}`, { method: "PATCH", body }, projectResponseSchema);
}

export function deleteProject(id: string) {
  return apiFetch(`/api/projects/${id}`, { method: "DELETE", parseJson: false });
}

export function listFolders(query?: { projectId?: string }) {
  return apiFetch("/api/folders", { query }, listFoldersResponseSchema);
}

export function createFolder(body: CreateFolderRequest) {
  createFolderRequestSchema.parse(body);
  return apiFetch("/api/folders", { method: "POST", body }, folderResponseSchema);
}

export function listActivity(query?: { limit?: number; offset?: number }) {
  return apiFetch("/api/activity", { query }, listActivityResponseSchema);
}

// ── Prompts ────────────────────────────────────────────────

export function listPrompts(query?: {
  domainId?: string;
  projectId?: string;
  folderId?: string;
  tag?: string;
  favorite?: boolean;
  q?: string;
  includeArchived?: boolean;
  limit?: number;
  offset?: number;
}) {
  return apiFetch(
    "/api/prompts",
    {
      query: {
        ...query,
        favorite: query?.favorite === undefined ? undefined : query.favorite ? "true" : "false",
        includeArchived:
          query?.includeArchived === undefined
            ? undefined
            : query.includeArchived
              ? "true"
              : "false",
      },
    },
    listPromptsResponseSchema,
  );
}

export function getPrompt(id: string) {
  return apiFetch(`/api/prompts/${id}`, {}, promptResponseSchema);
}

export function createPrompt(body: CreatePromptRequest) {
  createPromptRequestSchema.parse(body);
  return apiFetch("/api/prompts", { method: "POST", body }, promptResponseSchema);
}

export function updatePrompt(id: string, body: UpdatePromptRequest) {
  updatePromptRequestSchema.parse(body);
  return apiFetch(`/api/prompts/${id}`, { method: "PATCH", body }, promptResponseSchema);
}

export function deletePrompt(id: string) {
  return apiFetch(`/api/prompts/${id}`, { method: "DELETE", parseJson: false });
}

export function listPromptVersions(promptId: string) {
  return apiFetch(`/api/prompts/${promptId}/versions`, {}, listPromptVersionsResponseSchema);
}

export function createPromptVersion(promptId: string, body: CreatePromptVersionRequest) {
  createPromptVersionRequestSchema.parse(body);
  return apiFetch(
    `/api/prompts/${promptId}/versions`,
    { method: "POST", body },
    promptVersionResponseSchema,
  );
}

export function restorePromptVersion(promptId: string, versionId: string) {
  return apiFetch(
    `/api/prompts/${promptId}/restore/${versionId}`,
    { method: "POST" },
    promptVersionResponseSchema,
  );
}

export function createPromptVariable(promptId: string, body: CreatePromptVariableRequest) {
  createPromptVariableRequestSchema.parse(body);
  return apiFetch(
    `/api/prompts/${promptId}/variables`,
    { method: "POST", body },
    promptVariableResponseSchema,
  );
}

export function updatePromptVariable(promptId: string, variableId: string, body: UpdatePromptVariableRequest) {
  updatePromptVariableRequestSchema.parse(body);
  return apiFetch(
    `/api/prompts/${promptId}/variables/${variableId}`,
    { method: "PATCH", body },
    promptVariableResponseSchema,
  );
}

export function deletePromptVariable(promptId: string, variableId: string) {
  return apiFetch(
    `/api/prompts/${promptId}/variables/${variableId}`,
    { method: "DELETE", parseJson: false },
  );
}

// ── Sessions ───────────────────────────────────────────────

export function listSessions(query?: { projectId?: string; domainId?: string; status?: string }) {
  return apiFetch("/api/sessions", { query }, listSessionsResponseSchema);
}

export function getSession(id: string) {
  return apiFetch(`/api/sessions/${id}`, {}, sessionDetailResponseSchema);
}

export function createSession(body: CreateSessionRequest) {
  createSessionRequestSchema.parse(body);
  return apiFetch("/api/sessions", { method: "POST", body }, sessionResponseSchema);
}

export function updateSession(id: string, body: UpdateSessionRequest) {
  updateSessionRequestSchema.parse(body);
  return apiFetch(`/api/sessions/${id}`, { method: "PATCH", body }, sessionResponseSchema);
}

export function appendSessionMessage(id: string, body: AppendSessionMessageRequest) {
  appendSessionMessageRequestSchema.parse(body);
  return apiFetch(
    `/api/sessions/${id}/messages`,
    { method: "POST", body },
    sessionMessageResponseSchema,
  );
}

// ── Runs / Compare ─────────────────────────────────────────

export function createRun(body: CreateRunInput) {
  const parsed = createRunRequestSchema.parse(body);
  return apiFetch("/api/runs", { method: "POST", body: parsed }, runResponseSchema);
}

export function listRuns(query?: {
  promptId?: string;
  promptVersionId?: string;
  model?: string;
  source?: string;
  status?: string;
  limit?: number;
}) {
  return apiFetch("/api/runs", { query }, listRunsResponseSchema);
}

export function getRun(id: string) {
  return apiFetch(`/api/runs/${id}`, {}, runResponseSchema);
}

export function createCompare(body: CreateCompareInput) {
  const parsed = createCompareRequestSchema.parse(body);
  return apiFetch("/api/compare", { method: "POST", body: parsed }, createCompareResponseSchema);
}

export function getCompareJob(jobId: string) {
  return apiFetch(`/api/compare/${jobId}`, {}, compareJobResponseSchema);
}

// ── Intelligence ───────────────────────────────────────────

export function analyzePrompt(body: AnalyzePromptInput) {
  const parsed = analyzePromptRequestSchema.parse(body);
  return apiFetch("/api/intelligence/analyze", { method: "POST", body: parsed }, analyzePromptResponseSchema);
}

export function recommendModel(body: RecommendInput) {
  const parsed = recommendRequestSchema.parse(body);
  return apiFetch("/api/intelligence/recommend", { method: "POST", body: parsed }, recommendResponseSchema);
}

export function routeModel(body: RouteInput) {
  const parsed = routeRequestSchema.parse(body);
  return apiFetch("/api/intelligence/route", { method: "POST", body: parsed }, routeResponseSchema);
}

export function getWorkspaceSettings() {
  return apiFetch("/api/workspace/settings", {}, workspaceSettingsResponseSchema);
}

export function updateWorkspaceSettings(body: UpdateWorkspaceSettingsRequest) {
  updateWorkspaceSettingsRequestSchema.parse(body);
  return apiFetch(
    "/api/workspace/settings",
    { method: "PUT", body },
    workspaceSettingsResponseSchema,
  );
}

export function listRoutingRules() {
  return apiFetch("/api/routing-rules", {}, listRoutingRulesResponseSchema);
}

export function createRoutingRule(body: CreateRoutingRuleRequest) {
  createRoutingRuleRequestSchema.parse(body);
  return apiFetch("/api/routing-rules", { method: "POST", body }, routingRuleResponseSchema);
}

export function updateRoutingRule(id: string, body: UpdateRoutingRuleRequest) {
  updateRoutingRuleRequestSchema.parse(body);
  return apiFetch(`/api/routing-rules/${id}`, { method: "PATCH", body }, routingRuleResponseSchema);
}

export function deleteRoutingRule(id: string) {
  return apiFetch(`/api/routing-rules/${id}`, { method: "DELETE", parseJson: false });
}

// ── Budgets / usage ────────────────────────────────────────

export function getCurrentBudget() {
  return apiFetch("/api/budgets/current", {}, currentBudgetResponseSchema);
}

export function updateBudget(body: UpdateBudgetRequest) {
  updateBudgetRequestSchema.parse(body);
  return apiFetch("/api/budgets/current", { method: "PUT", body }, currentBudgetResponseSchema);
}

export function listBudgetScopes() {
  return apiFetch("/api/budgets/scopes", {}, listBudgetScopesResponseSchema);
}

export function getUsageSummary(query?: { from?: string; to?: string; groupBy?: string }) {
  return apiFetch("/api/usage/summary", { query }, usageSummaryResponseSchema);
}

export function getSavings() {
  return apiFetch("/api/savings", {}, savingsResponseSchema);
}

export function replaceBudgetScopes(body: UpdateBudgetScopesRequest) {
  updateBudgetScopesRequestSchema.parse(body);
  return apiFetch("/api/budgets/scopes", { method: "PUT", body }, updateBudgetScopesResponseSchema);
}

// ── Keys ───────────────────────────────────────────────────

export function listApiKeys() {
  return apiFetch("/api/keys", {}, listApiKeysResponseSchema);
}

export function createApiKey(body: CreateApiKeyRequest) {
  createApiKeyRequestSchema.parse(body);
  return apiFetch("/api/keys", { method: "POST", body }, createApiKeyResponseSchema);
}

export function deleteApiKey(id: string) {
  return apiFetch(`/api/keys/${id}`, { method: "DELETE" }, deleteApiKeyResponseSchema);
}

export function listProviderKeys() {
  return apiFetch("/api/provider-keys", {}, listProviderKeysResponseSchema);
}

export function createProviderKey(body: CreateProviderKeyRequest) {
  createProviderKeyRequestSchema.parse(body);
  return apiFetch("/api/provider-keys", { method: "POST", body }, createProviderKeyResponseSchema);
}

export function deleteProviderKey(id: string) {
  return apiFetch(`/api/provider-keys/${id}`, { method: "DELETE" }, deleteProviderKeyResponseSchema);
}

// ── Search ─────────────────────────────────────────────────

export function search(query: { q: string; type?: string; limit?: number }) {
  return apiFetch("/api/search", { query }, searchResponseSchema);
}

// ── Admin ──────────────────────────────────────────────────

/** Admin analytics (local → :8787; production → same-origin Hono / Next). */
export function getAdminAnalytics(): Promise<AdminAnalyticsResponse> {
  return apiFetch("/api/admin/analytics", {}, adminAnalyticsResponseSchema);
}
