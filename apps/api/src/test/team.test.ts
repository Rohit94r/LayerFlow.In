import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startTestDb } from "./helpers/integration-db";

/**
 * Team / RBAC tests: invite, accept, role changes, member removal, and
 * permission enforcement for admins vs members. Uses a stub email transport
 * (sendEmail is a no-op without RESEND_API_KEY), so tokens must be read
 * directly from the invitations table.
 */

process.env.REDIS_URL = "redis://127.0.0.1:6399";
process.env.RESEND_API_KEY = "";

const stopDb = await startTestDb();

async function pendingInviteToken(db: any, email: string) {
  const rows = await db.query.invitations.findMany({ where: (i: any, { eq }: any) => eq(i.email, email) });
  return rows[0]?.token;
}

describe("team / RBAC", () => {
  beforeAll(async () => {
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    const { db } = await import("../db/client");
    await migrate(db, { migrationsFolder: "./drizzle" });
  });

  afterAll(async () => {
    const { pool } = await import("../db/client");
    const { redis } = await import("../redis/client");
    await pool.end();
    redis.disconnect();
    await stopDb.stop();
  });

  it("lists the owner as the only member with owner role", async () => {
    const { createApp } = await import("../app");
    const { createTestSession } = await import("./auth");
    const session = await createTestSession({ name: "Team Owner" });

    const res = await createApp().request("/api/team", {
      headers: { cookie: session.cookie },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.role).toBe("owner");
    expect(body.members).toHaveLength(1);
    expect(body.members[0].role).toBe("owner");
    expect(body.members[0].email).toBeTruthy();
    expect(body.invitations).toHaveLength(0);
  });

  it("invites a member, accepts it from a second account, and promotes them", async () => {
    const { createApp } = await import("../app");
    const { createTestSession } = await import("./auth");
    const { db } = await import("../db/client");
    const app = createApp();

    const owner = await createTestSession({ name: "Inviting Owner" });

    const invite = await app.request("/api/team/invitations", {
      method: "POST",
      headers: { cookie: owner.cookie, "content-type": "application/json" },
      body: JSON.stringify({ email: "new-member@test.dev", role: "member" }),
    });
    expect(invite.status).toBe(201);
    const inviteBody = (await invite.json()) as any;
    expect(inviteBody.invitation.status).toBe("pending");
    expect(inviteBody.invitation.role).toBe("member");

    // Duplicate invite is rejected.
    const dup = await app.request("/api/team/invitations", {
      method: "POST",
      headers: { cookie: owner.cookie, "content-type": "application/json" },
      body: JSON.stringify({ email: "new-member@test.dev", role: "member" }),
    });
    expect(dup.status).toBe(409);

    // A random logged-in user cannot accept an invite addressed to another email.
    const stranger = await createTestSession({ name: "Stranger", email: "stranger@test.dev" });
    const token = await pendingInviteToken(db, "new-member@test.dev");
    const rejected = await app.request("/api/team/invitations/accept", {
      method: "POST",
      headers: { cookie: stranger.cookie, "content-type": "application/json" },
      body: JSON.stringify({ token }),
    });
    expect(rejected.status).toBe(403);

    // The invitee (correct email) accepts.
    const invitee = await createTestSession({ name: "New Member", email: "new-member@test.dev" });
    const accept = await app.request("/api/team/invitations/accept", {
      method: "POST",
      headers: { cookie: invitee.cookie, "content-type": "application/json" },
      body: JSON.stringify({ token }),
    });
    expect(accept.status).toBe(200);
    const acceptBody = (await accept.json()) as any;
    expect(acceptBody.role).toBe("member");

    // Invitee's own default workspace is their private one; select the shared
    // workspace explicitly (as a workspace switcher would).
    const memberHeaders = {
      cookie: invitee.cookie,
      "content-type": "application/json",
      "x-lf-workspace": acceptBody.workspaceId,
    };

    // Owner sees 2 members now.
    const list = await app.request("/api/team", { headers: { cookie: owner.cookie } });
    const listBody = (await list.json()) as any;
    expect(listBody.members).toHaveLength(2);

    // Member cannot invite (member < admin).
    const memberInvite = await app.request("/api/team/invitations", {
      method: "POST",
      headers: memberHeaders,
      body: JSON.stringify({ email: "third@test.dev", role: "member" }),
    });
    expect(memberInvite.status).toBe(403);

    // Owner promotes the member to admin.
    const memberRow = listBody.members.find((m: any) => m.email === "new-member@test.dev");
    const promote = await app.request(`/api/team/members/${memberRow.id}`, {
      method: "PATCH",
      headers: { cookie: owner.cookie, "content-type": "application/json" },
      body: JSON.stringify({ role: "admin" }),
    });
    expect(promote.status).toBe(200);
    expect(((await promote.json()) as any).member.role).toBe("admin");

    // Admin can now invite.
    const adminInvite = await app.request("/api/team/invitations", {
      method: "POST",
      headers: memberHeaders,
      body: JSON.stringify({ email: "third@test.dev", role: "member" }),
    });
    expect(adminInvite.status).toBe(201);

    // Owner removes the promoted member.
    const remove = await app.request(`/api/team/members/${memberRow.id}`, {
      method: "DELETE",
      headers: { cookie: owner.cookie },
    });
    expect(remove.status).toBe(200);

    const finalList = await app.request("/api/team", { headers: { cookie: owner.cookie } });
    const finalBody = (await finalList.json()) as any;
    expect(finalBody.members).toHaveLength(1);
  });

  it("does not allow changing or removing the owner", async () => {
    const { createApp } = await import("../app");
    const { createTestSession } = await import("./auth");
    const app = createApp();

    const owner = await createTestSession({ name: "Protected Owner" });
    const list = await app.request("/api/team", { headers: { cookie: owner.cookie } });
    const ownerRow = ((await list.json()) as any).members[0];

    const demote = await app.request(`/api/team/members/${ownerRow.id}`, {
      method: "PATCH",
      headers: { cookie: owner.cookie, "content-type": "application/json" },
      body: JSON.stringify({ role: "member" }),
    });
    expect(demote.status).toBe(403);

    const remove = await app.request(`/api/team/members/${ownerRow.id}`, {
      method: "DELETE",
      headers: { cookie: owner.cookie },
    });
    expect(remove.status).toBe(403);
  });

  it("rejects expired invitations", async () => {
    const { createApp } = await import("../app");
    const { createTestSession } = await import("./auth");
    const { db } = await import("../db/client");
    const { eq } = await import("drizzle-orm");
    const { invitations } = await import("../db/schema/tenancy");
    const app = createApp();

    const owner = await createTestSession({ name: "Expiry Owner" });
    await app.request("/api/team/invitations", {
      method: "POST",
      headers: { cookie: owner.cookie, "content-type": "application/json" },
      body: JSON.stringify({ email: "late@test.dev", role: "member" }),
    });

    await db.update(invitations).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(invitations.email, "late@test.dev"));

    const invitee = await createTestSession({ name: "Late Member", email: "late@test.dev" });
    const token = await pendingInviteToken(db, "late@test.dev");
    const res = await app.request("/api/team/invitations/accept", {
      method: "POST",
      headers: { cookie: invitee.cookie, "content-type": "application/json" },
      body: JSON.stringify({ token }),
    });
    expect(res.status).toBe(410);
  });
});
