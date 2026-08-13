import net from "node:net";

/**
 * Boot an isolated Postgres for integration tests.
 *
 * Default: an in-memory PGlite (real Postgres + pgvector, WASM) served over
 * TCP. This is the CI-safe default — every test file gets a fresh database,
 * so parallel test files can never race migrations or share accumulated data.
 *
 * To run against a real Postgres instead, set `LAYERFLOW_TEST_REAL_PG=1`
 * (e.g. a local `docker compose up -d`). NOTE: the real-Postgres path uses
 * the shared `layerflow` database and is NOT parallel-safe — run it with
 * vitest `--maxWorkers=1`.
 *
 * Must be awaited BEFORE any module that imports `../db/client` — the pool
 * reads DATABASE_URL once at import time.
 */
export async function startTestDb(): Promise<{ stop: () => Promise<void> }> {
  if (process.env.LAYERFLOW_TEST_REAL_PG !== "1") {
    const { PGlite } = await import("@electric-sql/pglite");
    const { vector } = await import("@electric-sql/pglite-pgvector");
    const { PGLiteSocketServer } = await import("@electric-sql/pglite-socket");

    const pglite = await PGlite.create({ extensions: { vector } });
    const port = 20_000 + Math.floor(Math.random() * 10_000);
    const server = new PGLiteSocketServer({
      db: pglite,
      port,
      host: "127.0.0.1",
      maxConnections: 10,
    });
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

  const dbUrl = new URL(process.env.DATABASE_URL!);
  const pgUp = await canConnect(dbUrl.hostname, Number(dbUrl.port || 5432));
  if (!pgUp) {
    throw new Error(
      "LAYERFLOW_TEST_REAL_PG=1 but no Postgres is reachable at " +
        `${dbUrl.host}:${dbUrl.port}. Start it (docker compose up -d) or unset ` +
        "LAYERFLOW_TEST_REAL_PG to use in-memory PGlite.",
    );
  }

  console.warn(
    "[integration] LAYERFLOW_TEST_REAL_PG=1 — sharing the real Postgres " +
      "database. This is NOT parallel-safe; run with --maxWorkers=1.\n",
  );
  return { stop: async () => undefined };
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
