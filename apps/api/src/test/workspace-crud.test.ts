import net from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * Integration tests for the workspace CRUD APIs:
 * domains, projects, folders, prompts + versions + restore, sessions,
 * files (local storage), and the activity feed.
 *
 * Same DB strategy as integration.test.ts: use docker-compose Postgres when
 * reachable, otherwise boot an in-memory PGlite served over TCP. (Each vitest
 * file runs in its own worker, so this file needs its own bootstrap.)
 */

function canConnect(host: string, port: number, timeoutMs = 1_500): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port });
    const done = (ok: boolean) => {
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(timeoutMs, () => done(false));
    socket.once("connect", () => done(true));
    socket.once("error", () => done(false));
  });
}

const dbUrl = new URL(process.env.DATABASE_URL!);
const pgUp = await canConnect(dbUrl.hostname, Number(dbUrl.port || 5432));

let stopFallbackDb: (() => Promise<void>) | undefined;

if (!pgUp) {
  const { PGlite } = await import("@electric-sql/pglite");
  const { vector } = await import("@electric-sql/pglite-pgvector");
  const { PGLiteSocketServer } = await import("@electric-sql/pglite-socket");

  const pglite = await PGlite.create({ extensions: { vector } });
  const port = 20000 + Math.floor(Math.random() * 10_000);
  const server = new PGLiteSocketServer({ db: pglite, port, host: "127.0.0.1", maxConnections: 10 });
  await server.start();

  process.env.DATABASE_URL = `postgres://postgres:postgres@127.0.0.1:${port}/postgres`;
  stopFallbackDb = async () => {
    await server.stop();
    await pglite.close();
  };
}

describe("workspace CRUD APIs", () => {
  let app: import("hono").Hono<import("../types").AppEnv>;
  let cookie: string;

  /** Small helper so tests read like the actual HTTP calls. */
  async function api(
    method: string,
    path: string,
    body?: unknown,
    overrideCookie?: string,
  ): Promise<{ status: number; json: any }> {
    const res = await app.request(path, {
      method,
      headers: {
        cookie: overrideCookie ?? cookie,
        ...(body !== undefined ? { "content-type": "application/json" } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const text = await res.text();
    return { status: res.status, json: text ? JSON.parse(text) : undefined };
  }

  beforeAll(async () => {
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    const { db } = await import("../db/client");
    await migrate(db, { migrationsFolder: "./drizzle" });

    const { createApp } = await import("../app");
    const { createTestSession } = await import("./auth");
    app = createApp();
    const session = await createTestSession({ name: "Crud Tester" });
    cookie = session.cookie;
  });

  afterAll(async () => {
    const { pool } = await import("../db/client");
    const { redis } = await import("../redis/client");
    await pool.end();
    redis.disconnect();
    await stopFallbackDb?.();
  });

  // ---------------------------------------------------------------- domains

  it("lists the 9 onboarded domains and creates a new one", async () => {
    const list = await api("GET", "/api/domains");
    expect(list.status).toBe(200);
    expect(list.json.domains).toHaveLength(9);

    const created = await api("POST", "/api/domains", {
      name: "Content Ideas",
      description: "Blog and newsletter drafts",
      color: "#ff0000",
    });
    expect(created.status).toBe(201);
    expect(created.json.domain.slug).toBe("content-ideas");
    expect(created.json.domain.sortOrder).toBe(9);

    const renamed = await api("PATCH", `/api/domains/${created.json.domain.id}`, {
      name: "Content Lab",
    });
    expect(renamed.status).toBe(200);
    expect(renamed.json.domain.name).toBe("Content Lab");
    // Slug stays stable on rename.
    expect(renamed.json.domain.slug).toBe("content-ideas");
  });

  it("refuses to delete a domain that still has projects", async () => {
    const domain = (await api("POST", "/api/domains", { name: "Doomed Domain" })).json.domain;
    const project = (
      await api("POST", "/api/projects", { domainId: domain.id, name: "Blocker Project" })
    ).json.project;

    const blocked = await api("DELETE", `/api/domains/${domain.id}`);
    expect(blocked.status).toBe(409);
    expect(blocked.json.error.code).toBe("domain_not_empty");

    await api("DELETE", `/api/projects/${project.id}`);
    const ok = await api("DELETE", `/api/domains/${domain.id}`);
    expect(ok.status).toBe(200);
  });

  // --------------------------------------------------------------- projects

  it("creates, filters, archives, and deletes projects", async () => {
    const domains = (await api("GET", "/api/domains")).json.domains;
    const coding = domains.find((d: any) => d.slug === "coding");

    const created = await api("POST", "/api/projects", {
      domainId: coding.id,
      name: "LayerFlow App",
      description: "Core product prompts",
    });
    expect(created.status).toBe(201);
    const projectId = created.json.project.id;

    const filtered = await api("GET", `/api/projects?domainId=${coding.id}`);
    expect(filtered.json.projects.some((p: any) => p.id === projectId)).toBe(true);

    const archived = await api("PATCH", `/api/projects/${projectId}`, { status: "archived" });
    expect(archived.json.project.status).toBe("archived");

    const activeOnly = await api("GET", "/api/projects?status=active");
    expect(activeOnly.json.projects.some((p: any) => p.id === projectId)).toBe(false);

    const restored = await api("PATCH", `/api/projects/${projectId}`, { status: "active" });
    expect(restored.json.project.status).toBe("active");

    // Creating a project under a made-up domain must fail.
    const bad = await api("POST", "/api/projects", { domainId: "dom_nope", name: "X" });
    expect(bad.status).toBe(404);
  });

  // ---------------------------------------------------------------- folders

  it("supports nested folders and rejects cycles", async () => {
    const domains = (await api("GET", "/api/domains")).json.domains;
    const project = (
      await api("POST", "/api/projects", { domainId: domains[0].id, name: "Folder Home" })
    ).json.project;

    const root = (await api("POST", "/api/folders", { projectId: project.id, name: "Root" }))
      .json.folder;
    const child = (
      await api("POST", "/api/folders", {
        projectId: project.id,
        parentFolderId: root.id,
        name: "Child",
      })
    ).json.folder;
    expect(child.parentFolderId).toBe(root.id);

    const list = await api("GET", `/api/folders?projectId=${project.id}`);
    expect(list.json.folders).toHaveLength(2);

    // Moving Root under its own child would create a cycle.
    const cycle = await api("PATCH", `/api/folders/${root.id}`, { parentFolderId: child.id });
    expect(cycle.status).toBe(400);
    expect(cycle.json.error.code).toBe("folder_cycle");

    const deleted = await api("DELETE", `/api/folders/${root.id}`);
    expect(deleted.status).toBe(200);
    // Children cascade away with the parent.
    const after = await api("GET", `/api/folders?projectId=${project.id}`);
    expect(after.json.folders).toHaveLength(0);
  });

  // ---------------------------------------------------------------- prompts

  it("creates a prompt with version 1 and supports list filters", async () => {
    const domains = (await api("GET", "/api/domains")).json.domains;
    const coding = domains.find((d: any) => d.slug === "coding");

    const created = await api("POST", "/api/prompts", {
      title: "App Sidebar Navigation",
      body: "Design a responsive sidebar for an AI workspace app.",
      domainId: coding.id,
      tags: ["ui", "react"],
    });
    expect(created.status).toBe(201);
    expect(created.json.prompt.tags).toEqual(["react", "ui"]);
    expect(created.json.currentVersion.version).toBe(1);
    expect(created.json.prompt.currentVersionId).toBe(created.json.currentVersion.id);
    const promptId = created.json.prompt.id;

    await api("POST", "/api/prompts", {
      title: "Unrelated Email Prompt",
      body: "Write a friendly follow-up email.",
    });

    const byTitle = await api("GET", "/api/prompts?q=sidebar");
    expect(byTitle.json.prompts).toHaveLength(1);
    expect(byTitle.json.prompts[0].id).toBe(promptId);

    const byTag = await api("GET", "/api/prompts?tag=react");
    expect(byTag.json.prompts.map((p: any) => p.id)).toContain(promptId);

    const byDomain = await api("GET", `/api/prompts?domainId=${coding.id}`);
    expect(byDomain.json.prompts.map((p: any) => p.id)).toContain(promptId);

    // Favorite it, then filter by favorite.
    const favorited = await api("PATCH", `/api/prompts/${promptId}`, { favorite: true });
    expect(favorited.json.prompt.favorite).toBe(true);
    const favs = await api("GET", "/api/prompts?favorite=true");
    expect(favs.json.prompts.map((p: any) => p.id)).toEqual([promptId]);

    // Archive hides it from the default list; includeArchived shows it.
    await api("PATCH", `/api/prompts/${promptId}`, { archived: true });
    const defaultList = await api("GET", "/api/prompts?q=sidebar");
    expect(defaultList.json.prompts).toHaveLength(0);
    const withArchived = await api("GET", "/api/prompts?q=sidebar&includeArchived=true");
    expect(withArchived.json.prompts).toHaveLength(1);
    await api("PATCH", `/api/prompts/${promptId}`, { archived: false });
  });

  it("appends immutable versions and restores old ones as new versions", async () => {
    const created = await api("POST", "/api/prompts", {
      title: "Versioned Prompt",
      body: "v1 body",
    });
    const promptId = created.json.prompt.id;
    const v1 = created.json.currentVersion;

    const v2 = await api("POST", `/api/prompts/${promptId}/versions`, {
      body: "v2 body",
      note: "Second draft",
      modelHint: "gpt-4o",
    });
    expect(v2.status).toBe(201);
    expect(v2.json.version.version).toBe(2);

    // currentVersionId follows the newest version.
    const detail = await api("GET", `/api/prompts/${promptId}`);
    expect(detail.json.prompt.currentVersionId).toBe(v2.json.version.id);
    expect(detail.json.currentVersion.body).toBe("v2 body");

    const single = await api("GET", `/api/prompts/${promptId}/versions/${v1.id}`);
    expect(single.status).toBe(200);
    expect(single.json.version.body).toBe("v1 body");

    // Restore v1 → creates v3 with v1's body; history is untouched.
    const restored = await api("POST", `/api/prompts/${promptId}/restore/${v1.id}`);
    expect(restored.status).toBe(201);
    expect(restored.json.version.version).toBe(3);
    expect(restored.json.version.body).toBe("v1 body");
    expect(restored.json.version.note).toBe("Restored from v1");

    const timeline = await api("GET", `/api/prompts/${promptId}/versions`);
    expect(timeline.json.versions.map((v: any) => v.version)).toEqual([3, 2, 1]);
    expect(timeline.json.versions[2].body).toBe("v1 body");

    const deleted = await api("DELETE", `/api/prompts/${promptId}`);
    expect(deleted.status).toBe(200);
    expect((await api("GET", `/api/prompts/${promptId}`)).status).toBe(404);
  });

  // --------------------------------------------------------------- sessions

  it("runs a session conversation chain end to end", async () => {
    const created = await api("POST", "/api/sessions", {
      title: "Resume Builder",
      description: "Iterating on resume bullets",
    });
    expect(created.status).toBe(201);
    const sessionId = created.json.session.id;

    const prompt = (
      await api("POST", "/api/prompts", { title: "Bullet Rewriter", body: "Rewrite: {{b}}" })
    ).json;

    const m1 = await api("POST", `/api/sessions/${sessionId}/messages`, {
      role: "user",
      body: "Rewrite my resume bullet about dashboards.",
      promptId: prompt.prompt.id,
      promptVersionId: prompt.currentVersion.id,
    });
    expect(m1.status).toBe(201);
    expect(m1.json.message.position).toBe(0);

    const m2 = await api("POST", `/api/sessions/${sessionId}/messages`, {
      role: "assistant",
      body: "Built 4 dashboards used by 30+ teammates weekly.",
    });
    expect(m2.json.message.position).toBe(1);

    const detail = await api("GET", `/api/sessions/${sessionId}`);
    expect(detail.status).toBe(200);
    expect(detail.json.messages.map((m: any) => m.position)).toEqual([0, 1]);
    expect(detail.json.messages[0].promptId).toBe(prompt.prompt.id);

    const completed = await api("PATCH", `/api/sessions/${sessionId}`, { status: "completed" });
    expect(completed.json.session.status).toBe("completed");

    const list = await api("GET", "/api/sessions?status=completed");
    expect(list.json.sessions.map((s: any) => s.id)).toContain(sessionId);

    expect((await api("DELETE", `/api/sessions/${sessionId}`)).status).toBe(200);
    expect((await api("GET", `/api/sessions/${sessionId}`)).status).toBe(404);
  });

  // ------------------------------------------------------------------ files

  it("uploads, attaches, downloads, and deletes a file (local storage)", async () => {
    const prompt = (
      await api("POST", "/api/prompts", { title: "With Attachment", body: "See attached." })
    ).json.prompt;

    const upload = await api("POST", "/api/files/upload-url", {
      fileName: "notes.txt",
      mimeType: "text/plain",
      sizeBytes: 11,
    });
    expect(upload.status).toBe(201);
    expect(upload.json.storage).toBe("local");
    const fileId = upload.json.file.id;

    // PUT the raw bytes to the returned URL (path part; we call the app directly).
    const putRes = await app.request(`/api/files/${fileId}/content`, {
      method: "PUT",
      headers: { cookie, "content-type": "text/plain" },
      body: "hello world",
    });
    expect(putRes.status).toBe(200);

    const complete = await api("POST", "/api/files/complete", {
      fileId,
      promptId: prompt.id,
    });
    expect(complete.status).toBe(200);
    expect(complete.json.attachedPromptId).toBe(prompt.id);
    expect(complete.json.file.sizeBytes).toBe(11);
    expect(complete.json.file.checksum).toHaveLength(64);

    const dl = await api("GET", `/api/files/${fileId}/download-url`);
    expect(dl.status).toBe(200);
    expect(dl.json.fileName).toBe("notes.txt");

    const content = await app.request(`/api/files/${fileId}/content`, {
      headers: { cookie },
    });
    expect(content.status).toBe(200);
    expect(await content.text()).toBe("hello world");

    expect((await api("DELETE", `/api/files/${fileId}`)).status).toBe(200);
    expect((await api("GET", `/api/files/${fileId}/download-url`)).status).toBe(404);
  });

  // --------------------------------------------------------------- activity

  it("records activity for creates and lists it newest-first", async () => {
    const res = await api("GET", "/api/activity");
    expect(res.status).toBe(200);
    expect(res.json.events.length).toBeGreaterThan(0);
    const types = res.json.events.map((e: any) => e.type);
    expect(types).toContain("prompt.created");
    expect(types).toContain("project.created");
    // Newest first.
    const times = res.json.events.map((e: any) => new Date(e.createdAt).getTime());
    expect([...times].sort((a, b) => b - a)).toEqual(times);
  });

  // ---------------------------------------------------------------- tenancy

  it("never leaks another workspace's data", async () => {
    const { createTestSession } = await import("./auth");
    const stranger = await createTestSession({ name: "Stranger Danger" });

    const prompt = (
      await api("POST", "/api/prompts", { title: "Private Prompt", body: "secret" })
    ).json.prompt;

    // The stranger can't read, edit, or delete it — 404, not 403 (no existence leak).
    expect((await api("GET", `/api/prompts/${prompt.id}`, undefined, stranger.cookie)).status).toBe(404);
    expect(
      (await api("PATCH", `/api/prompts/${prompt.id}`, { title: "Hijack" }, stranger.cookie))
        .status,
    ).toBe(404);
    expect(
      (await api("DELETE", `/api/prompts/${prompt.id}`, undefined, stranger.cookie)).status,
    ).toBe(404);

    // And their prompt list doesn't include it.
    const list = await api("GET", "/api/prompts", undefined, stranger.cookie);
    expect(list.json.prompts.map((p: any) => p.id)).not.toContain(prompt.id);

    // Their activity feed is separate from ours.
    const activity = await api("GET", "/api/activity", undefined, stranger.cookie);
    expect(activity.json.events).toHaveLength(0);
  });
});
