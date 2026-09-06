import {
  acceptInvitationRequestSchema,
  acceptInvitationResponseSchema,
  createInvitationRequestSchema,
  createInvitationResponseSchema,
  listTeamResponseSchema,
  revokeInvitationResponseSchema,
  updateMemberRoleRequestSchema,
  updateMemberRoleResponseSchema,
  type AcceptInvitationResponse,
  type CreateInvitationRequest,
  type CreateInvitationResponse,
  type ListTeamResponse,
  type RevokeInvitationResponse,
  type UpdateMemberRoleResponse,
} from "@layerflow/contracts";
import { apiFetch, getServerCookieHeader } from "@/lib/api/client";

export const teamService = {
  /** GET /api/team — members + invitations (RSC-safe). */
  get: async (): Promise<ListTeamResponse> => {
    const headers = await getServerCookieHeader();
    return apiFetch<ListTeamResponse>(
      "/api/team",
      { ...(headers.Cookie ? { headers } : {}) },
      listTeamResponseSchema,
    );
  },

  invite: async (body: CreateInvitationRequest): Promise<CreateInvitationResponse> =>
    apiFetch<CreateInvitationResponse>(
      "/api/team/invitations",
      { method: "POST", body: createInvitationRequestSchema.parse(body) },
      createInvitationResponseSchema,
    ),

  accept: async (token: string): Promise<AcceptInvitationResponse> =>
    apiFetch<AcceptInvitationResponse>(
      "/api/team/invitations/accept",
      { method: "POST", body: acceptInvitationRequestSchema.parse({ token }) },
      acceptInvitationResponseSchema,
    ),

  revoke: async (id: string): Promise<RevokeInvitationResponse> =>
    apiFetch<RevokeInvitationResponse>(
      `/api/team/invitations/${id}`,
      { method: "DELETE" },
      revokeInvitationResponseSchema,
    ),

  updateRole: async (id: string, role: "admin" | "member"): Promise<UpdateMemberRoleResponse> =>
    apiFetch<UpdateMemberRoleResponse>(
      `/api/team/members/${id}`,
      { method: "PATCH", body: updateMemberRoleRequestSchema.parse({ role }) },
      updateMemberRoleResponseSchema,
    ),

  remove: async (id: string) =>
    apiFetch(`/api/team/members/${id}`, { method: "DELETE" }),
};
