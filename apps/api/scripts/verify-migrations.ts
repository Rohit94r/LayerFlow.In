import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite-pgvector";

/**
 * Applies every migration in ./drizzle against an in-memory WASM Postgres
 * (with pgvector). Lets you check migration SQL without Docker running:
 * `npm run db:verify`.
 */
async function main() {
  const migrationsDir = join(import.meta.dirname, "..", "drizzle");
  const journal = JSON.parse(readFileSync(join(migrationsDir, "meta", "_journal.json"), "utf8"));

  const client = new PGlite({ extensions: { vector } });

  for (const entry of journal.entries as { tag: string }[]) {
    const sql = readFileSync(join(migrationsDir, `${entry.tag}.sql`), "utf8");
    // Same splitting drizzle's migrator uses.
    for (const statement of sql.split("--> statement-breakpoint")) {
      const trimmed = statement.trim();
      if (trimmed) await client.exec(trimmed);
    }
    console.log(`applied ${entry.tag}`);
  }

  const tables = await client.query<{ count: string }>(
    "select count(*)::text as count from information_schema.tables where table_schema = 'public'",
  );
  console.log(`OK: migrations applied cleanly (${tables.rows[0].count} tables created)`);
  await client.close();
}

main().catch((err) => {
  console.error("Migration verification FAILED:");
  console.error(err);
  process.exit(1);
});
