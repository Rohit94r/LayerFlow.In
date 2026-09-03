import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { canConnect, startTestDb } from "./helpers/integration-db";

process.env.REDIS_URL = "redis://127.0.0.1:6399";
process.env.GROQ_API_KEY = "";
process.env.GEMINI_API_KEY = "";
process.env.OPENAI_API_KEY = "";
process.env.DEEPSEEK_API_KEY = "";
process.env.XAI_API_KEY = "";
process.env.KIMI_API_KEY = "";
process.env.ELEVENLABS_API_KEY = "";
process.env.RESEND_API_KEY = "";

const stopDb = await startTestDb();

describe("tenant isolation", () => {
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

  it("sessions from workspace A cannot access messages from workspace B", async () => {
    const { createTestSession } = await import("./auth");
    const { db } = await import("../db/client");
    const { aiChatSessions } = await import("../db/schema/chat");
    const { and, eq } = await import("drizzle-orm");

    const sessionA = await createTestSession({ name: "Alice", email: "alice@test.dev" });
    const sessionB = await createTestSession({ name: "Bob", email: "bob@test.dev" });

    const [bSession] = await db
      .insert(aiChatSessions)
      .values({ workspaceId: sessionB.workspaceId, userId: sessionB.userId, title: "Bob's secret", source: "new", autoSwitch: true })
      .returning();

    const aSessions = await db.query.aiChatSessions.findMany({
      where: (s, { eq }) => eq(s.workspaceId, sessionA.workspaceId),
    });
    expect(aSessions.find((s) => s.id === bSession.id)).toBeUndefined();

    const aLookup = await db.query.aiChatSessions.findFirst({
      where: (s, { and, eq }) => and(eq(s.id, bSession.id), eq(s.workspaceId, sessionA.workspaceId)),
    });
    expect(aLookup).toBeUndefined();
  });

  it("a file from workspace A cannot be accessed from workspace B", async () => {
    const { createTestSession } = await import("./auth");
    const { db } = await import("../db/client");
    const { files } = await import("../db/schema/files");

    const sessionA = await createTestSession();

    const [file] = await db
      .insert(files)
      .values({ workspaceId: sessionA.workspaceId, ownerUserId: sessionA.userId, fileName: "secret.txt", mimeType: "text/plain", objectKey: "ws-a/secret.txt", sizeBytes: 100 })
      .returning();

    const sessionB = await createTestSession();
    const bFiles = await db.query.files.findMany({
      where: (f, { eq }) => eq(f.workspaceId, sessionB.workspaceId),
    });
    expect(bFiles.find((f) => f.id === file.id)).toBeUndefined();
  });

  it("an agent from workspace A cannot be accessed from workspace B", async () => {
    const { createTestSession } = await import("./auth");
    const { db } = await import("../db/client");
    const { agents } = await import("../db/schema/agents");

    const sessionA = await createTestSession();

    const [agent] = await db
      .insert(agents)
      .values({ workspaceId: sessionA.workspaceId, name: "Alice's Agent", role: "custom", systemPrompt: "helpful", tools: [], status: "active" })
      .returning();

    const sessionB = await createTestSession();
    const bAgents = await db.query.agents.findMany({
      where: (a, { eq }) => eq(a.workspaceId, sessionB.workspaceId),
    });
    expect(bAgents.find((a) => a.id === agent.id)).toBeUndefined();
  });

  it("a budget from workspace A cannot be modified from workspace B", async () => {
    const { createTestSession } = await import("./auth");
    const { db } = await import("../db/client");
    const { budgets } = await import("../db/schema/cost");
    const { and, eq } = await import("drizzle-orm");

    const sessionA = await createTestSession();

    const [budget] = await db
      .insert(budgets)
      .values({ workspaceId: sessionA.workspaceId, period: "2026-07", monthlyLimitMicro: 1_000_000 })
      .returning();

    const sessionB = await createTestSession();
    const bBudgets = await db.query.budgets.findMany({
      where: (b, { eq }) => eq(b.workspaceId, sessionB.workspaceId),
    });
    expect(bBudgets.find((b) => b.id === budget.id)).toBeUndefined();

    const result = await db
      .update(budgets)
      .set({ monthlyLimitMicro: 999_999_999 })
      .where(and(eq(budgets.id, budget.id), eq(budgets.workspaceId, sessionB.workspaceId)))
      .returning();
    expect(result.length).toBe(0);

    const reloaded = await db.query.budgets.findFirst({
      where: (b, { eq }) => eq(b.id, budget.id),
    });
    expect(reloaded?.monthlyLimitMicro).toBe(1_000_000);
  });
});
