import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startTestDb } from "./helpers/integration-db";

/**
 * Integration tests for memory, keyword search, collections, and clone.
 * Every file gets a fresh in-memory PGlite (real Postgres + pgvector) so
 * parallel files never share data or race migrations. Keyword search is
 * mandatory; semantic similarity is best-effort and skipped with a clear
 * message if pgvector queries fail.
 */

const stopDb = await startTestDb();

describe("memory / search / community integration", () => {
  beforeAll(async () => {
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    const { db } = await import("../db/client");
    await migrate(db, { migrationsFolder: "./drizzle" });
    const { seedLearning } = await import("../services/learning/seed");
    await seedLearning();
  });

  afterAll(async () => {
    const { pool } = await import("../db/client");
    const { redis } = await import("../redis/client");
    await pool.end();
    redis.disconnect();
    await stopDb.stop();
  });

  it("memory CRUD + keyword search", async () => {
    const { createApp } = await import("../app");
    const { createTestSession } = await import("./auth");
    const app = createApp();
    const session = await createTestSession({ name: "Memory Tester" });
    const headers = {
      cookie: session.cookie,
      "content-type": "application/json",
    };

    const created = await app.request("/api/memory", {
      method: "POST",
      headers,
      body: JSON.stringify({
        title: "Budget meter tip",
        body: "Always show spent vs monthly limit in micro-dollars.",
      }),
    });
    expect(created.status).toBe(201);
    const createdBody = (await created.json()) as any;
    expect(createdBody.memory.title).toBe("Budget meter tip");
    expect(createdBody.memory.sourceType).toBe("manual");
    const memoryId = createdBody.memory.id as string;

    const listed = await app.request("/api/memory", { headers: { cookie: session.cookie } });
    expect(listed.status).toBe(200);
    expect(((await listed.json()) as any).memories.some((m: any) => m.id === memoryId)).toBe(
      true,
    );

    const patched = await app.request(`/api/memory/${memoryId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ title: "Budget meter tip (edited)" }),
    });
    expect(patched.status).toBe(200);
    expect(((await patched.json()) as any).memory.title).toContain("edited");

    // Keyword search must always work (ILIKE).
    const search = await app.request("/api/memory/search?q=micro-dollars", {
      headers: { cookie: session.cookie },
    });
    expect(search.status).toBe(200);
    const searchBody = (await search.json()) as any;
    expect(searchBody.results.length).toBeGreaterThan(0);
    expect(searchBody.results[0].memory.id).toBe(memoryId);

    const deleted = await app.request(`/api/memory/${memoryId}`, {
      method: "DELETE",
      headers: { cookie: session.cookie },
    });
    expect(deleted.status).toBe(204);
  });

  it("GET /api/search finds prompts by title/body via ILIKE", async () => {
    const { createApp } = await import("../app");
    const { createTestSession } = await import("./auth");
    const { db } = await import("../db/client");
    const { prompts, promptVersions } = await import("../db/schema/prompts");
    const { eq } = await import("drizzle-orm");

    const app = createApp();
    const session = await createTestSession({ name: "Search Tester" });

    const [prompt] = await db
      .insert(prompts)
      .values({
        workspaceId: session.workspaceId,
        title: "UniqueZebra Prompt Title",
        description: "A searchable description",
      })
      .returning();
    const [version] = await db
      .insert(promptVersions)
      .values({
        promptId: prompt.id,
        workspaceId: session.workspaceId,
        version: 1,
        body: "Write a UniqueZebra haiku about databases.",
        createdByUserId: session.userId,
      })
      .returning();
    await db
      .update(prompts)
      .set({ currentVersionId: version.id })
      .where(eq(prompts.id, prompt.id));

    const res = await app.request("/api/search?q=UniqueZebra&type=prompt", {
      headers: { cookie: session.cookie },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.results.some((r: any) => r.id === prompt.id && r.type === "prompt")).toBe(true);
  });

  it("collections CRUD + prompt clone within workspace", async () => {
    const { createApp } = await import("../app");
    const { createTestSession } = await import("./auth");
    const { db } = await import("../db/client");
    const { prompts, promptVersions } = await import("../db/schema/prompts");
    const { eq } = await import("drizzle-orm");

    const app = createApp();
    const session = await createTestSession({ name: "Community Tester" });
    const headers = {
      cookie: session.cookie,
      "content-type": "application/json",
    };

    const [prompt] = await db
      .insert(prompts)
      .values({
        workspaceId: session.workspaceId,
        title: "Cloneable Prompt",
        description: "Source for clone test",
      })
      .returning();
    const [version] = await db
      .insert(promptVersions)
      .values({
        promptId: prompt.id,
        workspaceId: session.workspaceId,
        version: 1,
        body: "Original body to clone.",
        createdByUserId: session.userId,
      })
      .returning();
    await db
      .update(prompts)
      .set({ currentVersionId: version.id })
      .where(eq(prompts.id, prompt.id));

    const created = await app.request("/api/collections", {
      method: "POST",
      headers,
      body: JSON.stringify({
        title: "My Public Pack",
        visibility: "public",
        description: "Starter prompts",
      }),
    });
    expect(created.status).toBe(201);
    const collection = ((await created.json()) as any).collection;
    expect(collection.title).toBe("My Public Pack");

    const added = await app.request(`/api/collections/${collection.id}/items`, {
      method: "POST",
      headers,
      body: JSON.stringify({ promptId: prompt.id }),
    });
    expect(added.status).toBe(201);

    const detail = await app.request(`/api/collections/${collection.id}`, {
      headers: { cookie: session.cookie },
    });
    expect(detail.status).toBe(200);
    expect(((await detail.json()) as any).items).toHaveLength(1);

    const cloned = await app.request(`/api/prompts/${prompt.id}/clone`, {
      method: "POST",
      headers: { cookie: session.cookie },
    });
    expect(cloned.status).toBe(201);
    const cloneBody = (await cloned.json()) as any;
    expect(cloneBody.sourcePromptId).toBe(prompt.id);
    expect(cloneBody.prompt.workspaceId).toBe(session.workspaceId);
    expect(cloneBody.prompt.title).toContain("copy");
    expect(cloneBody.prompt.id).not.toBe(prompt.id);

    const deleted = await app.request(`/api/collections/${collection.id}`, {
      method: "DELETE",
      headers: { cookie: session.cookie },
    });
    expect(deleted.status).toBe(204);
  });

  it("learning paths are seeded and progress works after submit", async () => {
    const { createApp } = await import("../app");
    const { createTestSession } = await import("./auth");
    const app = createApp();
    const session = await createTestSession({ name: "Learner" });
    const headers = {
      cookie: session.cookie,
      "content-type": "application/json",
    };

    const pathsRes = await app.request("/api/learning/paths", {
      headers: { cookie: session.cookie },
    });
    expect(pathsRes.status).toBe(200);
    const paths = ((await pathsRes.json()) as any).paths as any[];
    expect(paths.length).toBeGreaterThanOrEqual(1);

    const detailRes = await app.request(`/api/learning/paths/${paths[0].slug}`, {
      headers: { cookie: session.cookie },
    });
    expect(detailRes.status).toBe(200);
    const detail = (await detailRes.json()) as any;
    expect(detail.challenges.length).toBeGreaterThan(0);

    const challengeId = detail.challenges[0].id as string;
    const submit = await app.request(`/api/learning/challenges/${challengeId}/submit`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        body:
          'You are a teacher. Explain machine learning to a beginner audience in a short format with concrete length constraints.',
      }),
    });
    expect(submit.status).toBe(201);
    const submission = ((await submit.json()) as any).submission;
    expect(["passed", "failed", "submitted"]).toContain(submission.status);

    const progress = await app.request("/api/learning/progress", {
      headers: { cookie: session.cookie },
    });
    expect(progress.status).toBe(200);
    const progressBody = (await progress.json()) as any;
    expect(progressBody.progress.some((p: any) => p.attemptedChallenges >= 1)).toBe(true);
  });

  it("similar search works with local embeddings (skips if pgvector fails)", async () => {
    const { createApp } = await import("../app");
    const { createTestSession } = await import("./auth");
    const { embedMemory } = await import("../services/memory/embed");
    const { db } = await import("../db/client");
    const { memories } = await import("../db/schema/memory");

    const app = createApp();
    const session = await createTestSession({ name: "Similar Tester" });

    const [memA] = await db
      .insert(memories)
      .values({
        workspaceId: session.workspaceId,
        userId: session.userId,
        sourceType: "manual",
        title: "AI budget tracking",
        body: "Track monthly AI spend against a hard budget meter.",
      })
      .returning();
    const [memB] = await db
      .insert(memories)
      .values({
        workspaceId: session.workspaceId,
        userId: session.userId,
        sourceType: "manual",
        title: "Resume rewrite",
        body: "Rewrite resume bullets with measurable impact metrics.",
      })
      .returning();

    // Embed inline (don't depend on Redis/BullMQ in tests).
    await embedMemory(memA.id, session.workspaceId);
    await embedMemory(memB.id, session.workspaceId);

    const res = await app.request(
      "/api/similar?text=" + encodeURIComponent("hard budget meter for AI spend"),
      { headers: { cookie: session.cookie } },
    );

    if (res.status === 503) {
      console.warn(
        "[memory-search] Skipping semantic similar assertion — pgvector query unavailable in this environment.",
      );
      return;
    }

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.embeddingModel).toBe("local-hash-v1");
    expect(body.results.length).toBeGreaterThan(0);
    // The budget memory should rank above the resume memory for this query.
    expect(body.results[0].memoryId).toBe(memA.id);
  });

  it("profiles me + notifications mark-read", async () => {
    const { createApp } = await import("../app");
    const { createTestSession } = await import("./auth");
    const app = createApp();
    const session = await createTestSession({ name: "Profile User" });
    const headers = {
      cookie: session.cookie,
      "content-type": "application/json",
    };

    const me = await app.request("/api/profiles/me", {
      headers: { cookie: session.cookie },
    });
    expect(me.status).toBe(200);
    const profile = ((await me.json()) as any).profile;
    expect(profile.userId).toBe(session.userId);
    expect(profile.handle).toBeTruthy();

    const patched = await app.request("/api/profiles/me", {
      method: "PATCH",
      headers,
      body: JSON.stringify({ displayName: "Profile User Updated", bio: "Hello" }),
    });
    expect(patched.status).toBe(200);
    expect(((await patched.json()) as any).profile.displayName).toBe("Profile User Updated");

    const notes = await app.request("/api/notifications", {
      headers: { cookie: session.cookie },
    });
    expect(notes.status).toBe(200);
    expect(((await notes.json()) as any).notifications).toBeInstanceOf(Array);
  });
});
