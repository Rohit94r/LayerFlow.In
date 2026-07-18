import { pool } from "../src/db/client";
import { redis } from "../src/redis/client";
import { defaultRollupDays, rollupUsageForDay } from "../src/services/budgets/rollup";

/**
 * CLI: recompute usage_rollups from the immutable usage_ledger.
 *
 *   npm run usage:rollup --workspace @layerflow/api            # yesterday + today
 *   npm run usage:rollup --workspace @layerflow/api -- 2026-07-15 2026-07-16
 */
async function main() {
  const args = process.argv.slice(2).filter((a) => /^\d{4}-\d{2}-\d{2}$/.test(a));
  const days = args.length > 0 ? args : defaultRollupDays();

  for (const day of days) {
    const result = await rollupUsageForDay(day);
    console.log(`rolled up ${result.day}: ${result.rows} rows across ${result.workspaces} workspaces`);
  }
}

main()
  .then(async () => {
    await pool.end();
    redis.disconnect();
  })
  .catch(async (err) => {
    console.error("usage rollup FAILED:", err);
    await pool.end().catch(() => undefined);
    redis.disconnect();
    process.exit(1);
  });
