import {
  agentApprovalDecisionResponseSchema,
  agentLogsResponseSchema,
  agentProgressResponseSchema,
  createAgentResponseSchema,
  createAgentRunResponseSchema,
  deleteAgentResponseSchema,
  getAgentResponseSchema,
  getAgentRunResponseSchema,
  getAgentScheduleResponseSchema,
  listAgentRunsResponseSchema,
  listAgentsResponseSchema,
  listAgentTemplatesResponseSchema,
  setAgentScheduleResponseSchema,
  startAgentResponseSchema,
  updateAgentResponseSchema,
  uploadAgentResumeResponseSchema,
  type AgentApprovalDecisionRequest,
  type AgentApprovalDecisionResponse,
  type AgentLogsResponse,
  type AgentProgressResponse,
  type CreateAgentRequest,
  type CreateAgentResponse,
  type CreateAgentRunRequest,
  type CreateAgentRunResponse,
  type DeleteAgentResponse,
  type GetAgentResponse,
  type GetAgentRunResponse,
  type GetAgentScheduleResponse,
  type ListAgentRunsResponse,
  type ListAgentsResponse,
  type ListAgentTemplatesResponse,
  type SetAgentScheduleRequest,
  type SetAgentScheduleResponse,
  type StartAgentResponse,
  type UpdateAgentRequest,
  type UpdateAgentResponse,
  type UploadAgentResumeRequest,
  type UploadAgentResumeResponse,
} from "@layerflow/contracts";
import { apiFetch, getServerCookieHeader } from "@/lib/api/client";

/**
 * Build-your-own agents — frontend service.
 * Agents are created/edited via JSON; runs are queued and executed by the
 * worker, so the client polls the run row until it settles.
 */
export const agentsService = {
  templates: async (): Promise<ListAgentTemplatesResponse> =>
    apiFetch<ListAgentTemplatesResponse>(
      "/api/agents/templates",
      {},
      listAgentTemplatesResponseSchema,
    ),

  list: async (): Promise<ListAgentsResponse> =>
    apiFetch<ListAgentsResponse>("/api/agents", {}, listAgentsResponseSchema),

  /** Server-component variant — forwards the session cookie (same-origin API). */
  listServer: async (): Promise<ListAgentsResponse> => {
    const headers = await getServerCookieHeader();
    return apiFetch<ListAgentsResponse>(
      "/api/agents",
      { ...(headers.Cookie ? { headers } : {}) },
      listAgentsResponseSchema,
    );
  },

  create: async (body: CreateAgentRequest): Promise<CreateAgentResponse> =>
    apiFetch<CreateAgentResponse>(
      "/api/agents",
      { method: "POST", body },
      createAgentResponseSchema,
    ),

  get: async (id: string): Promise<GetAgentResponse> =>
    apiFetch<GetAgentResponse>(`/api/agents/${id}`, {}, getAgentResponseSchema),

  update: async (
    id: string,
    body: UpdateAgentRequest,
  ): Promise<UpdateAgentResponse> =>
    apiFetch<UpdateAgentResponse>(
      `/api/agents/${id}`,
      { method: "PATCH", body },
      updateAgentResponseSchema,
    ),

  start: async (id: string): Promise<StartAgentResponse> =>
    apiFetch<StartAgentResponse>(
      `/api/agents/${id}/start`,
      { method: "POST" },
      startAgentResponseSchema,
    ),

  pause: async (id: string): Promise<UpdateAgentResponse> =>
    apiFetch<UpdateAgentResponse>(
      `/api/agents/${id}/pause`,
      { method: "POST" },
      updateAgentResponseSchema,
    ),

  resume: async (id: string): Promise<UpdateAgentResponse> =>
    apiFetch<UpdateAgentResponse>(
      `/api/agents/${id}/resume`,
      { method: "POST" },
      updateAgentResponseSchema,
    ),

  progress: async (id: string): Promise<AgentProgressResponse> =>
    apiFetch<AgentProgressResponse>(
      `/api/agents/${id}/progress`,
      {},
      agentProgressResponseSchema,
    ),

  logs: async (id: string): Promise<AgentLogsResponse> =>
    apiFetch<AgentLogsResponse>(`/api/agents/${id}/logs`, {}, agentLogsResponseSchema),

  decideApproval: async (
    id: string,
    body: AgentApprovalDecisionRequest,
  ): Promise<AgentApprovalDecisionResponse> =>
    apiFetch<AgentApprovalDecisionResponse>(
      `/api/agents/${id}/approve`,
      { method: "POST", body },
      agentApprovalDecisionResponseSchema,
    ),

  uploadResume: async (
    id: string,
    body: UploadAgentResumeRequest,
  ): Promise<UploadAgentResumeResponse> =>
    apiFetch<UploadAgentResumeResponse>(
      `/api/agents/${id}/upload-resume`,
      { method: "POST", body },
      uploadAgentResumeResponseSchema,
    ),

  remove: async (id: string): Promise<DeleteAgentResponse> =>
    apiFetch<DeleteAgentResponse>(
      `/api/agents/${id}`,
      { method: "DELETE" },
      deleteAgentResponseSchema,
    ),

  queueRun: async (id: string, body: CreateAgentRunRequest): Promise<CreateAgentRunResponse> =>
    apiFetch<CreateAgentRunResponse>(
      `/api/agents/${id}/runs`,
      { method: "POST", body },
      createAgentRunResponseSchema,
    ),

  listRuns: async (
    id: string,
    params?: { limit?: number; offset?: number },
  ): Promise<ListAgentRunsResponse> => {
    const qs = new URLSearchParams();
    if (params?.limit != null) qs.set("limit", String(params.limit));
    if (params?.offset != null) qs.set("offset", String(params.offset));
    const q = qs.toString();
    return apiFetch<ListAgentRunsResponse>(
      `/api/agents/${id}/runs${q ? `?${q}` : ""}`,
      {},
      listAgentRunsResponseSchema,
    );
  },

  getRun: async (runId: string): Promise<GetAgentRunResponse> =>
    apiFetch<GetAgentRunResponse>(`/api/agents/runs/${runId}`, {}, getAgentRunResponseSchema),

  getSchedule: async (id: string): Promise<GetAgentScheduleResponse> =>
    apiFetch<GetAgentScheduleResponse>(
      `/api/agents/${id}/schedule`,
      {},
      getAgentScheduleResponseSchema,
    ),

  setSchedule: async (
    id: string,
    body: SetAgentScheduleRequest,
  ): Promise<SetAgentScheduleResponse> =>
    apiFetch<SetAgentScheduleResponse>(
      `/api/agents/${id}/schedule`,
      { method: "POST", body },
      setAgentScheduleResponseSchema,
    ),
};
