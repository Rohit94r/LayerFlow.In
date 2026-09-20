import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

/**
 * Byte-honest destructive clear: DROP + recreate the public schema, then
 * re-apply every drizzle migration so the DB is EMPTY but STRUCTURE-CORRECT.
 *
 *   LF_DB_CLEAR_CONFIRM=LOCAL  npm run db:clear --workspace @layerflow/api
 *   LF_DB_CLEAR_CONFIRM=PROD   npm run db:clear --workspace @layerflow/api
 *
 * Safety guard (prevents cross-environment wipe): the confirmation token must
 * state whether the TARGET you are about to drop LOOKS local or production.
 * We derive that from the DATABASE_URL host — NOT from your belief — and
 * refuse to run if the token disagrees with the actual reachable bytes.
 */
const host = new URL("postgres://x" + (process.env.DATABASE_URL ?? "").slice((process.env.DATABASE_URL ?? "").lastIndexOf("@"))).hostname;

const looksLocal = host === "localhost" || host === "127.0.0.1" || host === "";
const want = process.env.LF_DB_CLEAR_CONFIRM;
if (!want) {
  console.error("Refusing: LF_DB_CLEAR_CONFIRM=LOCAL|PROD required (host is " + host + ").");
  process.exit(2);
}
const declaresLocal = want === "LOCAL";
if (declaresLocal !== looksLocal) {
  console.error(
    "Refusing: you said " + want + " but DATABASE_URL host is '" + host + "', which reads " +
    (looksLocal ? "LOCAL" : "PRODUCTION") + ". Nothing was touched."
  );
  process.exit(2);
}
console.log("Wiping " + (looksLocal ? "LOCAL" : "PRODUCTION") + " database at " + host + " (public schema)…");

import pg from "pg";
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
await client.query("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;");
await client.end();
console.log("Schema dropped+recreated. Re-applying migrations…");

const db = drizzle(new pg.Pool({ connectionString: process.env.DATABASE_URL }));
await migrate(db, { migrationsFolder: resolve(import.meta.dirname, "..", "drizzle") });
console.log("Database cleared and re-migrated: EMPTY tables, correct structure.");
