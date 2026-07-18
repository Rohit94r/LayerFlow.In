import net from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * Integration tests.
 *
 * Postgres: uses the docker-compose instance when reachable; otherwise boots
 * an in-memory PGlite (real Postgres + pgvector, WASM) served over TCP so the
 * DB-backed tests always run.
 * Redis: the full /health check only runs when Redis is reachable
 * (`docker compose up -d` at the repo root).
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
const redisUrl = new URL(process.env.REDIS_URL!);
const pgUp = await canConnect(dbUrl.hostname, Number(dbUrl.port || 5432));
const redisUp = await canConnect(redisUrl.hostname, Number(redisUrl.port || 6379));

let stopFallbackDb: (() => Promise<void>) | undefined;

if (!pgUp) {
  console.warn(
    "\n[integration] Docker Postgres not reachable — using in-memory PGlite over TCP." +
      "\n[integration] Run `docker compose up -d` at the repo root to test against real Postgres.\n",
  );
  const { PGlite } = await import("@electric-sql/pglite");
  const { vector } = await import("@electric-sql/pglite-pgvector");
  const { PGLiteSocketServer } = await import("@electric-sql/pglite-socket");

  const pglite = await PGlite.create({ extensions: { vector } });
  const port = 20000 + Math.floor(Math.random() * 10_000);
  const server = new PGLiteSocketServer({ db: pglite, port, host: "127.0.0.1", maxConnections: 10 });
  await server.start();

  // Must happen before any module calls getEnv()/creates the pool.
  process.env.DATABASE_URL = `postgres://postgres:postgres@127.0.0.1:${port}/postgres`;
  stopFallbackDb = async () => {
    await server.stop();
    await pglite.close();
  };
}

if (!redisUp) {
  console.warn(
    "\n[integration] Redis not reachable — skipping the full /health check." +
      "\n[integration] Run `docker compose up -d` at the repo root to enable it.\n",
  );
}

describe("API integration", () => {
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
    await stopFallbackDb?.();
  });

  it("GET /api/workspaces/current returns 401 without a session", async () => {
    const { createApp } = await import("../app");
    const res = await createApp().request("/api/workspaces/current");
    expect(res.status).toBe(401);
    const body = (await res.json()) as any;
    expect(body.error.code).toBe("unauthorized");
  });

  it("GET /api/workspaces/current returns the onboarded workspace", async () => {
    const { createApp } = await import("../app");
    const { createTestSession } = await import("./auth");

    const session = await createTestSession({ name: "Iris Integration" });
    const res = await createApp().request("/api/workspaces/current", {
      headers: { cookie: session.cookie },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.workspace.id).toBe(session.workspaceId);
    expect(body.workspace.name).toBe("Iris's Workspace");
    expect(body.role).toBe("owner");
  });

  it("onboarding seeds the 9 default domains and a budget", async () => {
    const { createTestSession } = await import("./auth");
    const { db } = await import("../db/client");

    const session = await createTestSession();
    const domains = await db.query.domains.findMany({
      where: (d, { eq }) => eq(d.workspaceId, session.workspaceId),
    });
    expect(domains.map((d) => d.slug).sort()).toEqual([
      "business",
      "clients",
      "coding",
      "marketing",
      "personal",
      "research",
      "resume",
      "school",
      "study",
    ]);

    const budget = await db.query.budgets.findFirst({
      where: (b, { eq }) => eq(b.workspaceId, session.workspaceId),
    });
    expect(budget?.hardBlock).toBe(true);
    expect(budget?.monthlyLimitMicro).toBeGreaterThan(0);
  });

  it("PATCH /api/workspaces/:id renames the workspace and rejects foreign IDs", async () => {
    const { createApp } = await import("../app");
    const { createTestSession } = await import("./auth");
    const app = createApp();

    const session = await createTestSession();
    const res = await app.request(`/api/workspaces/${session.workspaceId}`, {
      method: "PATCH",
      headers: { cookie: session.cookie, "content-type": "application/json" },
      body: JSON.stringify({ name: "Renamed Workspace" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.workspace.name).toBe("Renamed Workspace");

    // Validation error shape
    const bad = await app.request(`/api/workspaces/${session.workspaceId}`, {
      method: "PATCH",
      headers: { cookie: session.cookie, "content-type": "application/json" },
      body: JSON.stringify({ name: "" }),
    });
    expect(bad.status).toBe(400);
    expect(((await bad.json()) as any).error.code).toBe("validation_error");

    // Tenancy: another user's workspace ID must be rejected
    const other = await createTestSession();
    const forbidden = await app.request(`/api/workspaces/${other.workspaceId}`, {
      method: "PATCH",
      headers: { cookie: session.cookie, "content-type": "application/json" },
      body: JSON.stringify({ name: "Hijack" }),
    });
    expect(forbidden.status).toBe(403);
  });

  it.runIf(redisUp)("GET /health reports db and redis up", async () => {
    const { createApp } = await import("../app");
    const res = await createApp().request("/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok", checks: { db: true, redis: true } });
  });
});
