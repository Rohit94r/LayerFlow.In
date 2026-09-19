import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

/**
 * Apply any pending drizzle migrations to the production Neon DB.
 *
 *   npm run db:migrate:prod --workspace @layerflow/api
 *
 * Reads DATABASE_URL from ../../fly.env (the committed prod env file) so it
 * can run from a laptop without any deploy pipeline. Safe to re-run: drizzle
 * tracks applied migrations in drizzle.__drizzle_migrations and skips them.
 */
function loadEnvFile(p: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    out[m[1]] = m[2].replace(/^"|"$/g, "");
  }
  return out;
}

async function main() {
  const fly = loadEnvFile(resolve("../../fly.env"));
  const url = fly.DATABASE_URL;
  if (!url) {
    console.error("No DATABASE_URL found in ../../fly.env");
    process.exit(1);
  }
  const host = /@([^/]+)/.exec(url)?.[1]?.split(":")[0];
  console.log("target:", host);

  const pool = new pg.Pool({ connectionString: url, max: 2 });
  const db = drizzle(pool);

  const before = await pool.query("SELECT count(*)::int AS n FROM drizzle.__drizzle_migrations");
  console.log("applied before run:", before.rows[0].n);

  await migrate(db, { migrationsFolder: resolve("drizzle") });

  const after = await pool.query("SELECT id, hash, created_at FROM drizzle.__drizzle_migrations ORDER BY id");
  for (const r of after.rows) console.log(`  applied #${r.id}  ${String(r.hash).slice(0, 14)}  @ ${new Date(Number(r.created_at)).toISOString()}`);
  console.log("applied after run:", after.rowCount);

  await pool.end();
}

main().catch((err) => {
  console.error("Migration FAILED:", err instanceof Error ? err.message : err);
  process.exit(1);
});
