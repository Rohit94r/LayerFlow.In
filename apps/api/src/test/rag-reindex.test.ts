import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startTestDb } from "./helpers/integration-db";

/**
 * Integration tests for the RAG file surface:
 *  - GET /api/files lists files with ragStatus + chunkCount
 *  - POST /api/files/:id/reindex rebuilds chunks (force) after delete clears them
 *  - DELETE /api/files/:id cleans up file-sourced memories
 *  - GET /api/memory?sourceType=file&sourceId= filters by origin
 *  - embedding backfill finds memories missing an embedding row
 *
 * Same PGlite-per-file isolation as memory-search.test.ts.
 */

const stopDb = await startTestDb();

describe("RAG file ingestion + re-index + embed backfill", () => {
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

  it("uploads a text file and re-indexes it into RAG memory", async () => {
    const { createApp } = await import("../app");
    const { createTestSession } = await import("./auth");
    const app = createApp();
    const session = await createTestSession({ name: "RAG Tester" });
    const headers = {
      cookie: session.cookie,
      "content-type": "application/json",
    };

    // 1. Upload URL → local PUT target
    const step1 = await app.request("/api/files/upload-url", {
      method: "POST",
      headers,
      body: JSON.stringify({
        fileName: "rag-guide.md",
        mimeType: "text/markdown",
        sizeBytes: 128,
      }),
    });
    expect(step1.status).toBe(201);
    const up = (await step1.json()) as any;
    expect(up.storage).toBe("local");
    const fileId = up.file.id as string;
    const putUrl = up.uploadUrl as string;

    // 2. PUT raw bytes to the local target
    const put = await app.request(putUrl, {
      method: "PUT",
      headers: { cookie: session.cookie, "content-type": "text/markdown" },
      body: "LayerFlow RAG knowledge base. Re-indexing must rebuild these paragraphs.",
    });
    expect(put.status).toBe(200);

    // 3. Complete → triggers first ingestion
    const done = await app.request("/api/files/complete", {
      method: "POST",
      headers,
      body: JSON.stringify({ fileId }),
    });
    expect(done.status).toBe(200);

    // 4. List shows the file indexed with chunks
    const list = await app.request("/api/files", { headers: { cookie: session.cookie } });
    expect(list.status).toBe(200);
    const listBody = (await list.json()) as any;
    const entry = listBody.files.find((f: any) => f.id === fileId);
    expect(entry).toBeTruthy();
    expect(entry.ragStatus).toBe("indexed");
    expect(entry.chunkCount).toBeGreaterThan(0);

    // 5. Memory list filtered by sourceId returns exactly that file's chunks
    const mem = await app.request(
      `/api/memory?sourceType=file&sourceId=${fileId}`,
      { headers: { cookie: session.cookie } },
    );
    expect(mem.status).toBe(200);
    const memBody = (await mem.json()) as any;
    expect(memBody.memories.length).toBe(entry.chunkCount);
    for (const m of memBody.memories) {
      expect(m.sourceType).toBe("file");
      expect(m.sourceId).toBe(fileId);
    }

    // 6. Re-index is idempotent (chunk count stable)
    const re = await app.request(`/api/files/${fileId}/reindex`, {
      method: "POST",
      headers: { cookie: session.cookie },
    });
    expect(re.status).toBe(200);
    const reBody = (await re.json()) as any;
    expect(reBody.file.chunkCount).toBe(entry.chunkCount);

    // 7. Delete clears the file AND its RAG chunks
    const del = await app.request(`/api/files/${fileId}`, {
      method: "DELETE",
      headers: { cookie: session.cookie },
    });
    expect(del.status).toBe(200);

    const after = await app.request(
      `/api/memory?sourceType=file&sourceId=${fileId}`,
      { headers: { cookie: session.cookie } },
    );
    expect((((await after.json()) as any).memories as unknown[]).length).toBe(0);
  });

  it("embedding backfill finds memories without an embedding row", async () => {
    const { db } = await import("../db/client");
    const { memories } = await import("../db/schema/memory");
    const { findUnembeddedMemories } = await import("../services/memory/embed");
    const { createTestSession } = await import("./auth");
    const session = await createTestSession({ name: "Backfill Tester" });

    // Insert a memory row directly, deliberately skipping the embed step that
    // createMemory would run — this is what a failed/purged enqueue leaves behind.
    const [row] = await db
      .insert(memories)
      .values({
        workspaceId: session.workspaceId,
        userId: session.userId,
        sourceType: "manual",
        title: "Unembedded fact",
        body: "This memory has no vector yet.",
      })
      .returning();

    const missing = await findUnembeddedMemories();
    expect(missing.some((m) => m.id === row.id)).toBe(true);

    // Re-run the sweep *with* embedding — after that the row is covered.
    const { requeueUnembeddedMemories } = await import("../services/memory/embed");
    await requeueUnembeddedMemories();

    const stillMissing = await findUnembeddedMemories();
    expect(stillMissing.some((m) => m.id === row.id)).toBe(false);
  });
});