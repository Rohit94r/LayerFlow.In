import "./db/prefer-ipv4";
import { getEnv } from "./config/env";
import {
  flushSentry,
  initSentry,
  installProcessErrorHandlers,
} from "./observability/sentry";

const env = getEnv(); // fails fast with a clear message if env is invalid

// Sentry must initialize before the HTTP server and app modules load.
initSentry();
installProcessErrorHandlers();

const [{ serve }, { createApp }, { logger }] = await Promise.all([
  import("@hono/node-server"),
  import("./app"),
  import("./config/logger"),
]);

const app = createApp();

// Dual-stack (::) so both http://127.0.0.1:8787 and http://localhost:8787
// work. macOS browsers often resolve localhost → ::1 first; IPv4-only bind
// made the sign-in page falsely show "API offline".
const server = serve(
  { fetch: app.fetch, port: env.PORT, hostname: "::" },
  (info) => {
    logger.info(
      `LayerFlow API listening on http://127.0.0.1:${info.port} (also localhost)`,
    );
  },
);

/**
 * Graceful shutdown: stop accepting connections, then close DB/Redis and
 * flush Sentry. Kubernetes/Fly send SIGTERM before killing the container.
 */
let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, "shutting down");

  const forceExit = setTimeout(() => {
    logger.warn("shutdown timed out — forcing exit");
    process.exit(1);
  }, 10_000);
  forceExit.unref();

  await new Promise<void>((resolve) => server.close(() => resolve()));

  const [{ pool }, { redis }, { closeQueues }] = await Promise.all([
    import("./db/client"),
    import("./redis/client"),
    import("./jobs/queues"),
  ]);
  await Promise.allSettled([
    pool.end(),
    redis.quit().catch(() => redis.disconnect()),
    closeQueues(),
    flushSentry(),
  ]);
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
