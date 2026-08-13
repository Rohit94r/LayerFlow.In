import { z } from "zod";
import { idSchema, timestampSchema } from "./common";

export const teamMemberRoleSchema = z.enum(["owner", "admin", "member"]);
export type TeamMemberRole = z.infer<typeof teamMemberRoleSchema>;

export const teamMemberSchema = z.object({
  id: idSchema,
  workspaceId: idSchema,
  userId: idSchema,
  role: teamMemberRoleSchema,
  name: z.string().nullable(),
  email: z.string().nullable(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});
export type TeamMember = z.infer<typeof teamMemberSchema>;

export const teamInvitationStatusSchema = z.enum(["pending", "accepted", "revoked", "expired"]);
export type TeamInvitationStatus = z.infer<typeof teamInvitationStatusSchema>;

export const teamInvitationSchema = z.object({
  id: idSchema,
  email: z.string().email(),
  role: z.enum(["admin", "member"]),
  status: teamInvitationStatusSchema,
  invitedBy: z.string().nullable(),
  expiresAt: timestampSchema,
  createdAt: timestampSchema,
});
export type TeamInvitation = z.infer<typeof teamInvitationSchema>;

/** GET /api/team — current workspace team (members + invitations). */
export const listTeamResponseSchema = z.object({
  role: teamMemberRoleSchema,
  members: z.array(teamMemberSchema),
  invitations: z.array(teamInvitationSchema),
});
export type ListTeamResponse = z.infer<typeof listTeamResponseSchema>;

/** POST /api/team/invitations */
export const createInvitationRequestSchema = z.object({
  email: z.string().email().max(254),
  role: z.enum(["admin", "member"]).default("member"),
});
export type CreateInvitationRequest = z.infer<typeof createInvitationRequestSchema>;

export const createInvitationResponseSchema = z.object({
  invitation: teamInvitationSchema,
});
export type CreateInvitationResponse = z.infer<typeof createInvitationResponseSchema>;

/** DELETE /api/team/invitations/:id */
export const revokeInvitationResponseSchema = z.object({
  id: idSchema,
  revoked: z.literal(true),
});
export type RevokeInvitationResponse = z.infer<typeof revokeInvitationResponseSchema>;

/** POST /api/team/invitations/accept */
export const acceptInvitationRequestSchema = z.object({
  token: z.string().min(1).max(256),
});
export type AcceptInvitationRequest = z.infer<typeof acceptInvitationRequestSchema>;

export const acceptInvitationResponseSchema = z.object({
  workspaceId: idSchema,
  workspaceName: z.string(),
  role: z.enum(["admin", "member"]),
});
export type AcceptInvitationResponse = z.infer<typeof acceptInvitationResponseSchema>;

/** PATCH /api/team/members/:id */
export const updateMemberRoleRequestSchema = z.object({
  role: z.enum(["admin", "member"]),
});
export type UpdateMemberRoleRequest = z.infer<typeof updateMemberRoleRequestSchema>;

export const updateMemberRoleResponseSchema = z.object({
  member: teamMemberSchema,
});
export type UpdateMemberRoleResponse = z.infer<typeof updateMemberRoleResponseSchema>;

/** DELETE /api/team/members/:id */
export const removeMemberResponseSchema = z.object({
  id: idSchema,
  removed: z.literal(true),
});
export type RemoveMemberResponse = z.infer<typeof removeMemberResponseSchema>;
