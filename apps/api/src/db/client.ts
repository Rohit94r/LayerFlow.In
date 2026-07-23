import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { getEnv } from "../config/env";
import { logger } from "../config/logger";
import "./prefer-ipv4";
import * as schema from "./schema";

/**
 * Neon pool settings: longer connect timeout for cold compute wake-ups,
 * idle timeout below Neon’s server-side drop, and keepalive so half-open
 * sockets don’t poison the pool. Idle client errors must be handled or
 * Node will crash the process.
 */
export const pool = new pg.Pool({
  connectionString: getEnv().DATABASE_URL,
  max: 10,
  connectionTimeoutMillis: 15_000,
  idleTimeoutMillis: 20_000,
  keepAlive: true,
});

pool.on("error", (err) => {
  logger.error({ err }, "idle pg client error");
});

export const db = drizzle(pool, { schema });

export type Db = typeof db;
