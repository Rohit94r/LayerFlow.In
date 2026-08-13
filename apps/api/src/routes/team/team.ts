import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import type { Context } from "hono";
import { randomBytes } from "node:crypto";
import {
  acceptInvitationRequestSchema,
  createInvitationRequestSchema,
  updateMemberRoleRequestSchema,
  type ListTeamResponse,
} from "@layerflow/contracts";
import { db } from "../../db/client";
import { users } from "../../db/schema/auth";
import { invitations, workspaceMembers, workspaces } from "../../db/schema/tenancy";
import { requireAuth } from "../../middleware/auth";
import { AppError } from "../../middleware/app-error";
import { inviteEmail } from "../../services/email/templates";
import { sendEmail } from "../../services/email/resend";
import { getEnv } from "../../config/env";
import type { AppEnv } from "../../types";

/**
 * Team management + RBAC.
 *
 * Roles: owner (created the workspace, cannot be demoted/removed),
 * admin (invite/revoke/manage roles/remove members), member (read-only).
 *
 * Invites are token-based: {APP_URL}/team?invite=<token>. Accepting requires
 * an authenticated session — sign up first, then open the invite link again.
 */

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const teamRouter = new Hono<AppEnv>();

teamRouter.use(requireAuth);

/** Role guard: throws unless the caller holds at least the given role. */
async function requireRole(c: Context<AppEnv>, min: "owner" | "admin" | "member") {
  const workspaceId = c.get("workspaceId");
  const userId = c.get("userId");
  const membership = await db.query.workspaceMembers.findFirst({
    where: (m, { and, eq }) => and(eq(m.workspaceId, workspaceId), eq(m.userId, userId)),
  });
  const role = membership?.role ?? "member";
  if (min === "owner" && role !== "owner") {
    throw new AppError(403, "forbidden", "Owner permission required");
  }
  if (min === "admin" && role !== "owner" && role !== "admin") {
    throw new AppError(403, "forbidden", "Admin permission required");
  }
  return { role, membership };
}

function toMemberDto(row: typeof workspaceMembers.$inferSelect, user?: typeof users.$inferSelect | null) {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    userId: row.userId,
    role: row.role,
    name: user?.name ?? null,
    email: user?.email ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// GET /api/team — current workspace members + invitations.
teamRouter.get("/", async (c) => {
  const workspaceId = c.get("workspaceId");
  const { role } = await requireRole(c, "member");

  const memberRows = await db.query.workspaceMembers.findMany({
    where: (m, { eq }) => eq(m.workspaceId, workspaceId),
    orderBy: (m, { asc }) => [asc(m.createdAt)],
  });
  const userIds = memberRows.map((m) => m.userId);
  const userRows = userIds.length
    ? await db.query.users.findMany({ where: (u, { inArray }) => inArray(u.id, userIds) })
    : [];
  const userById = new Map(userRows.map((u) => [u.id, u]));

  const invitationRows = await db.query.invitations.findMany({
    where: (inv, { and, eq }) => and(eq(inv.workspaceId, workspaceId), eq(inv.status, "pending")),
    orderBy: (inv, { desc }) => [desc(inv.createdAt)],
  });
  const invitedByUserIds = invitationRows.map((i) => i.invitedByUserId);
  const invitedByRows = invitedByUserIds.length
    ? await db.query.users.findMany({ where: (u, { inArray }) => inArray(u.id, invitedByUserIds) })
    : [];
  const invitedByEmail = new Map(invitedByRows.map((u) => [u.id, u.email]));

  const response: ListTeamResponse = {
    role,
    members: memberRows.map((m) => toMemberDto(m, userById.get(m.userId))),
    invitations: invitationRows.map((i) => ({
      id: i.id,
      email: i.email,
      role: i.role,
      status: i.status,
      invitedBy: invitedByEmail.get(i.invitedByUserId) ?? null,
      expiresAt: i.expiresAt.toISOString(),
      createdAt: i.createdAt.toISOString(),
    })),
  };
  return c.json(response);
});

// POST /api/team/invitations — admin+.
teamRouter.post("/invitations", async (c) => {
  const workspaceId = c.get("workspaceId");
  const userId = c.get("userId");
  await requireRole(c, "admin");

  const body = createInvitationRequestSchema.parse(await c.req.json());
  const email = body.email.toLowerCase().trim();

  const workspace = await db.query.workspaces.findFirst({ where: (w, { eq }) => eq(w.id, workspaceId) });
  if (!workspace) throw new AppError(404, "not_found", "Workspace not found");

  const existingUser = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.email, email),
  });

  if (existingUser) {
    const already = await db.query.workspaceMembers.findFirst({
      where: (m, { and, eq }) => and(eq(m.workspaceId, workspaceId), eq(m.userId, existingUser.id)),
    });
    if (already) throw new AppError(409, "already_member", "That user is already a member");
  }

  const existingInvite = await db.query.invitations.findFirst({
    where: (inv, { and, eq }) =>
      and(
        eq(inv.workspaceId, workspaceId),
        eq(inv.email, email),
        eq(inv.status, "pending"),
      ),
  });
  if (existingInvite) {
    throw new AppError(409, "already_invited", "An invitation for this email is already pending");
  }

  const token = `lfinv_${randomBytes(24).toString("hex")}`;
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

  const [invitation] = await db
    .insert(invitations)
    .values({
      workspaceId,
      email,
      role: body.role,
      token,
      invitedByUserId: userId,
      status: "pending",
      expiresAt,
    })
    .returning();

  const inviter = await db.query.users.findFirst({ where: (u, { eq }) => eq(u.id, userId) });
  const inviteUrl = `${getEnv().WEB_URL}/team?invite=${token}`;
  const sent = await sendEmail({
    to: email,
    ...inviteEmail({
      workspaceName: workspace.name,
      invitedByEmail: inviter?.email ?? "A LayerFlow teammate",
      role: body.role,
      inviteUrl,
      expiresAt: expiresAt.toISOString(),
    }),
  });

  // sendEmail is a no-op without RESEND_API_KEY ({ sent:false, skipped:true });
  // that's fine for local dev/tests. Only a real delivery failure rolls back.
  if (sent.error) {
    await db.delete(invitations).where(eq(invitations.id, invitation.id));
    throw new AppError(502, "email_unavailable", "Could not send the invitation email");
  }

  return c.json(
    {
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        invitedBy: existingUser?.email ?? null,
        expiresAt: invitation.expiresAt.toISOString(),
        createdAt: invitation.createdAt.toISOString(),
      },
    },
    201,
  );
});

// DELETE /api/team/invitations/:id — admin+.
teamRouter.delete("/invitations/:id", async (c) => {
  const workspaceId = c.get("workspaceId");
  await requireRole(c, "admin");

  const [deleted] = await db
    .delete(invitations)
    .where(and(eq(invitations.workspaceId, workspaceId), eq(invitations.id, c.req.param("id"))))
    .returning({ id: invitations.id });
  if (!deleted) throw new AppError(404, "not_found", "Invitation not found");

  return c.json({ id: deleted.id, revoked: true });
});

// POST /api/team/invitations/accept — authenticated user joins the workspace.
teamRouter.post("/invitations/accept", async (c) => {
  const userId = c.get("userId");
  const body = acceptInvitationRequestSchema.parse(await c.req.json());

  const invitation = await db.query.invitations.findFirst({
    where: (inv, { eq }) => eq(inv.token, body.token),
  });
  if (!invitation) throw new AppError(404, "not_found", "Invitation not found");
  if (invitation.status !== "pending") throw new AppError(409, "invitation_used", "This invitation is no longer valid");
  if (invitation.expiresAt.getTime() < Date.now()) {
    throw new AppError(410, "invitation_expired", "This invitation has expired");
  }

  const user = await db.query.users.findFirst({ where: (u, { eq }) => eq(u.id, userId) });
  if (!user) throw new AppError(404, "not_found", "User not found");
  if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
    throw new AppError(403, "forbidden", "This invitation was sent to a different email");
  }

  const already = await db.query.workspaceMembers.findFirst({
    where: (m, { and, eq }) =>
      and(eq(m.workspaceId, invitation.workspaceId), eq(m.userId, userId)),
  });
  if (already) throw new AppError(409, "already_member", "You are already a member");

  const [membership] = await db
    .insert(workspaceMembers)
    .values({ workspaceId: invitation.workspaceId, userId, role: invitation.role })
    .returning();

  await db.update(invitations).set({ status: "accepted" }).where(eq(invitations.id, invitation.id));

  const workspace = await db.query.workspaces.findFirst({
    where: (w, { eq }) => eq(w.id, membership.workspaceId),
  });

  return c.json({
    workspaceId: membership.workspaceId,
    workspaceName: workspace?.name ?? "",
    role: membership.role,
  });
});

// PATCH /api/team/members/:id — admin+; owners cannot be modified.
teamRouter.patch("/members/:id", async (c) => {
  const workspaceId = c.get("workspaceId");
  await requireRole(c, "admin");

  const body = updateMemberRoleRequestSchema.parse(await c.req.json());

  const target = await db.query.workspaceMembers.findFirst({
    where: (m, { and, eq }) => and(eq(m.workspaceId, workspaceId), eq(m.id, c.req.param("id"))),
  });
  if (!target) throw new AppError(404, "not_found", "Member not found");
  if (target.role === "owner") throw new AppError(403, "forbidden", "Owner roles cannot be changed");

  const [updated] = await db
    .update(workspaceMembers)
    .set({ role: body.role })
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.id, target.id)))
    .returning();

  const user = await db.query.users.findFirst({ where: (u, { eq }) => eq(u.id, updated.userId) });
  return c.json({ member: await toMemberDto(updated, user) });
});

// DELETE /api/team/members/:id — admin+; owners cannot be removed.
teamRouter.delete("/members/:id", async (c) => {
  const workspaceId = c.get("workspaceId");
  const userId = c.get("userId");
  await requireRole(c, "admin");

  const target = await db.query.workspaceMembers.findFirst({
    where: (m, { and, eq }) => and(eq(m.workspaceId, workspaceId), eq(m.id, c.req.param("id"))),
  });
  if (!target) throw new AppError(404, "not_found", "Member not found");
  if (target.role === "owner") throw new AppError(403, "forbidden", "Owners cannot be removed");
  if (target.userId === userId) throw new AppError(403, "forbidden", "You cannot remove yourself");

  await db
    .delete(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.id, target.id)));

  return c.json({ id: target.id, removed: true });
});
