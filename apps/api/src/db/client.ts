import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { getEnv } from "../config/env";
import * as schema from "./schema";

export const pool = new pg.Pool({
  connectionString: getEnv().DATABASE_URL,
  max: 10,
});

export const db = drizzle(pool, { schema });

export type Db = typeof db;
