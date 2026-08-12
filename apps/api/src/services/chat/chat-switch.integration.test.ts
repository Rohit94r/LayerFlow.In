import { asc, eq } from "drizzle-orm";
import type { Provider } from "@layerflow/model-registry";
import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import { startTestDb } from "../../test/helpers/integration-db";
import { providerKeys } from "../../db/schema/gateway";
import { budgets } from "../../db/schema/cost";
import { aiChatMessages } from "../../db/schema/chat";
import { encryptSecret } from "../crypto";
import type { ChatRunEvent } from "./router";
import type { ChatCompletionRequest, ProviderAdapter } from "../ai/providers/types";

// Force local-hash embeddings so a BYOK openai key in the workspace can never
// trigger a real OpenAI embedding call during memory retrieval.
vi.mock("../search/embeddings", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../search/embeddings")>();
  return {
    ...actual,
    embedText: async (_workspaceId: string, text: string) => ({
      vector: actual.localEmbed(text),
      model: actual.LOCAL_EMBEDDING_MODEL,
    }),
  };
});

type Store = typeof import("./store");
type Router = typeof import("./router");
type Context = typeof import("./context");
type Providers = typeof import("../ai/providers");

let stopDb: { stop: () => Promise<void> } | undefined;
let db: import("../../db/client").Db;
let store: Store;
let router: Router;
let context: Context;
let providers: Providers;
let userId = "";
let workspaceId = "";

/**
 * Multi-model switch integration tests.
 *
 * DB must be booted before any module that imports `db/client` (the pool
 * reads DATABASE_URL at import time), so everything DB-backed is imported
 * dynamically in `beforeAll`. Provider adapters are mocked per-test so no
 * network ever leaves the box; `autoSwitch`/`userModel` drive which provider
 * the router actually answers with.
 */

const captured: Array<{ provider: Provider; req: ChatCompletionRequest }> = [];

function adapterFor(provider: Provider, mode: "ok" | "fail" = "ok"): ProviderAdapter {
  return {
    provider,
    async chatCompletion(req) {
      captured.push({ provider, req });
      if (mode === "fail") throw new Error("401 Unauthorized (mock)");
      return {
        content:
          `${provider} reply — ${provider} answered with a fully formed answer. ` +
          "This body is long enough to pass any minimum-length checks.",
        inputTokens: 100,
        outputTokens: 50,
        latencyMs: 12,
      };
    },
  };
}

function install(map: Record<string, "ok" | "fail">): void {
  for (const [p, mode] of Object.entries(map)) {
    providers.setAdapterForTests(p as Provider, adapterFor(p as Provider, mode));
  }
}

async function addKey(provider: Provider): Promise<void> {
  await db.insert(providerKeys).values({
    workspaceId,
    provider,
    keyHint: `tk-${provider}-${Math.random().toString(36).slice(2, 8)}`,
    ciphertext: await encryptSecret(`sk-${provider}-test-secret`),
  });
}

async function newSession(): Promise<{ sessionId: string }> {
  // Failover chains must be deterministic: every test starts with a clean key
  // table for this workspace so leftover keys can't answer on a later test's
  // behalf (e.g. a stale google key answering after the openai mock fails).
  await db.delete(providerKeys).where(eq(providerKeys.workspaceId, workspaceId));
  const session = await store.createChatSession({
    workspaceId,
    userId,
    title: "switch test",
    source: "new",
  });
  return { sessionId: session.id };
}

function doneReply(events: ChatRunEvent[]) {
  const done = events.find((e) => e.type === "done");
  expect(done, "expected a done event").toBeDefined();
  return done!.reply!;
}

describe("chat router — multi-model switching (provider isolation)", () => {
  beforeAll(async () => {
    // Platform env keys (real .env values) must not leak into the failover
    // chain — adapters are mocked and only workspace BYOK keys should decide
    // which provider answers. Set before config/env caches process.env (dotenv
    // won't overwrite vars that already exist).
    for (const key of [
      "OPENAI_API_KEY",
      "GEMINI_API_KEY",
      "DEEPSEEK_API_KEY",
      "GROQ_API_KEY",
      "KIMI_API_KEY",
      "XAI_API_KEY",
    ]) {
      process.env[key] = "";
    }

    stopDb = await startTestDb();
    const client = await import("../../db/client");
    db = client.db;
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    await migrate(db, { migrationsFolder: "./drizzle" });

    const { createTestSession } = await import("../../test/auth");
    const session = await createTestSession();
    userId = session.userId;
    workspaceId = session.workspaceId;

    store = await import("./store");
    router = await import("./router");
    context = await import("./context");
    providers = await import("../ai/providers");

    // Soft budgets: reserve/settle degrades gracefully when Redis is absent.
    await db.update(budgets).set({ hardBlock: false }).where(eq(budgets.workspaceId, workspaceId));

    install({ openai: "ok", deepseek: "ok", google: "ok" });
  });

  afterAll(async () => {
    const { pool } = await import("../../db/client");
    const { redis } = await import("../../redis/client");
    await pool.end();
    redis.disconnect();
    await stopDb?.stop();
  });

  it("buildMessages: 50-message thread → summary + last 8, metadata stripped", async () => {
    const { sessionId } = await newSession();
    for (let i = 0; i < 50; i++) {
      await store.insertChatMessage({
        sessionId,
        role: i % 2 === 0 ? "user" : "assistant",
        content: `message ${i}`,
        provider: "deepseek",
        model: "deepseek-chat",
        keyHint: "tk-deepseek-0000",
      });
    }
    const summarize = vi.fn(async () => "[Earlier conversation: summarized history block]");
    const msgs = await context.buildMessages(
      { workspaceId, sessionId, model: "gpt-4o-mini" },
      { summarize },
    );

    expect(summarize).toHaveBeenCalledTimes(1);
    const summarizeInput = (
      vi.mocked(summarize).mock.calls as unknown as Array<Array<{ older: unknown[] }>>
    )[0][0];
    expect(summarizeInput.older).toHaveLength(42);

    expect(msgs[0].role).toBe("system");
    expect(msgs[0].content).toContain("You are GPT");
    expect(msgs[1].content).toContain("[Earlier conversation:");
    // Only role + content — provider/model metadata never leaks into the request.
    expect(msgs.some((m) => m.content.includes("deepseek-chat"))).toBe(false);
    expect(msgs.some((m) => m.content.includes("tk-deepseek-0000"))).toBe(false);
    expect(msgs.some((m) => m.content.includes("message 0"))).toBe(false);
    const nonSystem = msgs.filter((m) => m.role !== "system");
    expect(nonSystem).toHaveLength(8);
    expect(nonSystem[7].content).toBe("message 49");
  });

  it("buildMessages: strips UI notices + empty drafts; keeps last 8", async () => {
    const { sessionId } = await newSession();
    for (let i = 0; i < 8; i++) {
      await store.insertChatMessage({
        sessionId,
        role: i % 2 === 0 ? "user" : "assistant",
        content: `m ${i}`,
      });
    }
    await store.insertChatMessage({
      sessionId,
      role: "system",
      content: "Heads-up: GPT was unavailable. I switched this conversation to DeepSeek.",
    });
    await store.insertChatMessage({ sessionId, role: "assistant", content: "" });

    const msgs = await context.buildMessages({
      workspaceId,
      sessionId,
      model: "gemini-flash-latest",
    });
    expect(msgs[0].content).toContain("You are Gemini");
    expect(msgs.filter((m) => m.role !== "system")).toHaveLength(8);
    expect(msgs.some((m) => m.content.includes("Heads-up"))).toBe(false);
    expect(msgs.some((m) => m.content === "")).toBe(false);
  });

  it("buildMessages: injects retrieved workspace memory for the latest user turn", async () => {
    const { sessionId } = await newSession();
    const { memories } = await import("../../db/schema/memory");
    const { embedMemory } = await import("../memory/embed");

    const [memory] = await db
      .insert(memories)
      .values({
        workspaceId,
        userId,
        sourceType: "manual",
        title: "Deployment",
        body: "Production API runs on Render at api.layerflow.app and the frontend on Vercel.",
      })
      .returning();
    await embedMemory(memory.id, workspaceId);

    await store.insertChatMessage({
      sessionId,
      role: "user",
      content: "Where is the production API hosted on Render?",
    });

    const msgs = await context.buildMessages({ workspaceId, sessionId, model: "gpt-4o-mini" });
    const memoryMsg = msgs.find((m) => m.content.startsWith("Relevant memory"));
    expect(memoryMsg).toBeDefined();
    expect(memoryMsg!.content).toContain("Deployment: Production API runs on Render");
  });

  it("user switch GPT → DeepSeek: fresh DeepSeek request, temp 0.6, no GPT prompt", async () => {
    install({ openai: "ok", deepseek: "ok" });
    const { sessionId } = await newSession();
    await addKey("openai");
    await addKey("deepseek");

    // Turn 1 — answered by GPT.
    captured.length = 0;
    const events1: ChatRunEvent[] = [];
    await router.runChatMessage({
      workspaceId,
      sessionId,
      content: "hello from gpt",
      userModel: "gpt-4o-mini",
      autoSwitch: false,
      onEvent: (e) => { events1.push(e); },
    });
    expect(captured).toHaveLength(1);
    expect(captured[0].provider).toBe("openai");
    expect(captured[0].req.model).toBe("gpt-4o-mini");
    expect(captured[0].req.temperature).toBe(0.7);
    expect(captured[0].req.messages[0].content).toContain("You are GPT");
    expect(doneReply(events1).model).toBe("gpt-4o-mini");
    expect(doneReply(events1).provider).toBe("openai");

    // Turn 2 — user switches to DeepSeek. Full rebuild: DeepSeek persona,
    // DeepSeek temperature, conversation history preserved, no GPT leftovers.
    captured.length = 0;
    const events2: ChatRunEvent[] = [];
    await router.runChatMessage({
      workspaceId,
      sessionId,
      content: "now answer as deepseek",
      userModel: "deepseek-chat",
      autoSwitch: false,
      onEvent: (e) => { events2.push(e); },
    });
    expect(captured).toHaveLength(1);
    expect(captured[0].provider).toBe("deepseek");
    expect(captured[0].req.model).toBe("deepseek-chat");
    expect(captured[0].req.temperature).toBe(0.6);
    expect(captured[0].req.messages[0].content).toContain("You are DeepSeek");
    expect(captured[0].req.messages[0].content).not.toContain("GPT");
    expect(captured[0].req.messages.filter((m) => m.role !== "system")).toHaveLength(3);
    expect(doneReply(events2).model).toBe("deepseek-chat");
    expect(doneReply(events2).provider).toBe("deepseek");

    // Stored rows carry the per-turn provider/model; no UI notice on a
    // user-initiated switch.
    const stored = await db.query.aiChatMessages.findMany({
      where: eq(aiChatMessages.sessionId, sessionId),
      orderBy: [asc(aiChatMessages.createdAt)],
    });
    const replies = stored.filter((m) => m.role === "assistant");
    expect(replies.map((r) => r.provider)).toEqual(["openai", "deepseek"]);
    expect(replies.map((r) => r.model)).toEqual(["gpt-4o-mini", "deepseek-chat"]);
    expect(stored.some((m) => m.role === "system")).toBe(false);
  });

  it("user switch DeepSeek → Gemini: Gemini persona + temp 0.7", async () => {
    install({ deepseek: "ok", google: "ok" });
    const { sessionId } = await newSession();
    await addKey("deepseek");
    await addKey("google");

    captured.length = 0;
    const events1: ChatRunEvent[] = [];
    await router.runChatMessage({
      workspaceId,
      sessionId,
      content: "deepseek first",
      userModel: "deepseek-chat",
      autoSwitch: false,
      onEvent: (e) => { events1.push(e); },
    });
    expect(captured[0].provider).toBe("deepseek");
    expect(captured[0].req.temperature).toBe(0.6);
    expect(doneReply(events1).model).toBe("deepseek-chat");

    captured.length = 0;
    const events2: ChatRunEvent[] = [];
    await router.runChatMessage({
      workspaceId,
      sessionId,
      content: "gemini now",
      userModel: "gemini-flash-latest",
      autoSwitch: false,
      onEvent: (e) => { events2.push(e); },
    });
    expect(captured).toHaveLength(1);
    expect(captured[0].provider).toBe("google");
    expect(captured[0].req.model).toBe("gemini-flash-latest");
    expect(captured[0].req.temperature).toBe(0.7);
    expect(captured[0].req.messages[0].content).toContain("You are Gemini");
    expect(captured[0].req.messages[0].content).not.toContain("DeepSeek");
    expect(doneReply(events2).model).toBe("gemini-flash-latest");
    expect(doneReply(events2).provider).toBe("google");
  });

  it("user switch Gemini → GPT: back to GPT persona, history intact", async () => {
    install({ google: "ok", openai: "ok" });
    const { sessionId } = await newSession();
    await addKey("google");
    await addKey("openai");

    captured.length = 0;
    await router.runChatMessage({
      workspaceId,
      sessionId,
      content: "gemini first",
      userModel: "gemini-flash-latest",
      autoSwitch: false,
      onEvent: () => undefined,
    });
    expect(captured[0].req.messages[0].content).toContain("You are Gemini");

    captured.length = 0;
    const events2: ChatRunEvent[] = [];
    await router.runChatMessage({
      workspaceId,
      sessionId,
      content: "back to gpt",
      userModel: "gpt-4o-mini",
      autoSwitch: false,
      onEvent: (e) => { events2.push(e); },
    });
    expect(captured[0].provider).toBe("openai");
    expect(captured[0].req.temperature).toBe(0.7);
    expect(captured[0].req.messages[0].content).toContain("You are GPT");
    expect(captured[0].req.messages[0].content).not.toContain("Gemini");
    expect(captured[0].req.messages.filter((m) => m.role !== "system")).toHaveLength(3);
    expect(doneReply(events2).model).toBe("gpt-4o-mini");
  });

  it("auto-switch: GPT fails → DeepSeek answers with a heads-up notice (never fed to the model)", async () => {
    install({ openai: "fail", deepseek: "ok" });
    const { sessionId } = await newSession();
    await addKey("openai");
    await addKey("deepseek");

    captured.length = 0;
    const events: ChatRunEvent[] = [];
    await router.runChatMessage({
      workspaceId,
      sessionId,
      content: "rescue me",
      userModel: "gpt-4o-mini",
      autoSwitch: true,
      onEvent: (e) => { events.push(e); },
    });

    const dsReq = captured.find((c) => c.provider === "deepseek");
    expect(dsReq).toBeDefined();
    expect(dsReq!.req.messages[0].content).toContain("You are DeepSeek");
    expect(dsReq!.req.messages[0].content).not.toContain("GPT");

    const done = events.find((e) => e.type === "done");
    expect(done?.reply?.model).toBe("deepseek-chat");
    expect(done?.reply?.provider).toBe("deepseek");
    expect(done?.reply?.switchedFrom).toMatchObject({
      fromModel: "gpt-4o-mini",
      toModel: "deepseek-chat",
    });

    const switched = events.find((e) => e.type === "switched");
    expect(switched).toMatchObject({ fromModel: "gpt-4o-mini", toModel: "deepseek-chat" });

    const stored = await db.query.aiChatMessages.findMany({
      where: eq(aiChatMessages.sessionId, sessionId),
      orderBy: [asc(aiChatMessages.createdAt)],
    });
    expect(stored.some((m) => m.role === "system" && m.content.startsWith("Heads-up:"))).toBe(true);

    // The notice is dropped on the next context build — the model only ever
    // sees the answering provider's persona.
    const nextBuild = await context.buildMessages({
      workspaceId,
      sessionId,
      model: "deepseek-chat",
    });
    expect(nextBuild.some((m) => m.content.includes("Heads-up"))).toBe(false);
    expect(nextBuild[0].content).toContain("You are DeepSeek");
    expect(nextBuild.filter((m) => m.role !== "system")).toHaveLength(2);
  });
});
