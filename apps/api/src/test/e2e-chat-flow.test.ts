import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { canConnect, startTestDb } from "./helpers/integration-db";

/**
 * E2E Chat Flow — creates a session, sends a message, verifies the persisted
 * message, and checks cost tracking via the store layer.
 */
process.env.REDIS_URL = "redis://127.0.0.1:6399";

const stopDb = await startTestDb();

describe("e2e chat flow", () => {
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

  it("creates a session → sends message → persists → reads back → verifies cost", async () => {
    const { createTestSession } = await import("./auth");
    const { createChatSession, toSessionDto, sessionExtrasFor, insertChatMessage, getChatSession } = await import("../services/chat/store");

    const session = await createTestSession();

    // 1. Create chat session
    const chatSession = await createChatSession({
      workspaceId: session.workspaceId,
      userId: session.userId,
      title: "E2E test chat",
      source: "new",
      autoSwitch: true,
    });
    expect(chatSession).toBeDefined();
    expect(chatSession.title).toBe("E2E test chat");
    expect(chatSession.workspaceId).toBe(session.workspaceId);

    const extras = await sessionExtrasFor(session.workspaceId, chatSession.id);
    const dto = toSessionDto(chatSession, extras);
    expect(dto.messageCount).toBe(0);
    expect(dto.cost).toBe(0);

    // 2. Insert a user message
    const userMsg = await insertChatMessage({
      sessionId: chatSession.id,
      role: "user",
      content: "What is 2+2?",
    });
    expect(userMsg).toBeDefined();
    expect(userMsg.role).toBe("user");
    expect(userMsg.content).toBe("What is 2+2?");

    // 3. Insert an assistant message (simulates a completed provider response)
    const assistantMsg = await insertChatMessage({
      sessionId: chatSession.id,
      role: "assistant",
      content: "The answer is 4.",
      model: "gpt-4o-mini",
      provider: "openai",
      tokensIn: 25,
      tokensOut: 8,
      costMicro: 42,
      latencyMs: 150,
    });
    expect(assistantMsg).toBeDefined();
    expect(assistantMsg.role).toBe("assistant");

    // 4. Read back and verify persistence
    const readBack = await getChatSession(session.workspaceId, chatSession.id);
    expect(readBack).not.toBeNull();
    expect(readBack!.messages.length).toBeGreaterThanOrEqual(2);

    const assistantMessage = readBack!.messages.find((m: any) => m.role === "assistant");
    expect(assistantMessage).toBeDefined();
    expect(assistantMessage!.content).toBe("The answer is 4.");

    // 5. Verify cost tracking
    expect(assistantMessage!.cost).toBeGreaterThan(0);

    const updatedExtras = await sessionExtrasFor(session.workspaceId, chatSession.id);
    expect(updatedExtras.messageCount).toBeGreaterThanOrEqual(2);
    expect(updatedExtras.costMicro).toBeGreaterThanOrEqual(42);
  });
});