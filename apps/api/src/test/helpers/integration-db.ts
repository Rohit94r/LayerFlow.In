import net from "node:net";

/**
 * Boot a Postgres for integration tests.
 *
 * Uses the docker-compose Postgres when reachable; otherwise boots an
 * in-memory PGlite (real Postgres + pgvector, WASM) served over TCP so
 * DB-backed tests always run. Must be awaited BEFORE any module that imports
 * `../db/client` — the pool reads DATABASE_URL once at import time.
 */
export async function startTestDb(): Promise<{ stop: () => Promise<void> }> {
  const dbUrl = new URL(process.env.DATABASE_URL!);
  const pgUp = await canConnect(dbUrl.hostname, Number(dbUrl.port || 5432));
  if (pgUp) return { stop: async () => undefined };

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

  return {
    stop: async () => {
      await server.stop();
      await pglite.close();
    },
  };
}

export function canConnect(host: string, port: number, timeoutMs = 1_500): Promise<boolean> {
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
