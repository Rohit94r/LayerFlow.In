import { pool } from "../src/db/client";
import { redis } from "../src/redis/client";
import { reconcileBudgets } from "../src/services/budgets/rollup";

/**
 * CLI: compare Redis live budget counters against the Postgres usage_ledger
 * for the current period and sync budgets.spent_micro.
 *
 *   npm run usage:reconcile --workspace @layerflow/api           # report only
 *   npm run usage:reconcile --workspace @layerflow/api -- --heal # also fix Redis
 */
async function main() {
  const heal = process.argv.includes("--heal");
  const rows = await reconcileBudgets({ heal });

  if (rows.length === 0) {
    console.log("no budgets found for the current period");
    return;
  }

  for (const row of rows) {
    const redisStr = row.redisMicro == null ? "unavailable" : `${row.redisMicro}µ$`;
    const drift =
      row.driftMicro == null ? "n/a" : `${row.driftMicro >= 0 ? "+" : ""}${row.driftMicro}µ$`;
    console.log(
      `${row.workspaceId} [${row.period}] ledger=${row.ledgerMicro}µ$ redis=${redisStr} ` +
        `drift=${drift}${row.healed ? " (healed)" : ""}`,
    );
  }

  const drifted = rows.filter((r) => r.driftMicro != null && r.driftMicro !== 0);
  console.log(
    `\n${rows.length} workspaces checked, ${drifted.length} with drift` +
      (heal ? "" : " — run with --heal to write ledger truth back to Redis"),
  );
}

main()
  .then(async () => {
    await pool.end();
    redis.disconnect();
  })
  .catch(async (err) => {
    console.error("reconciliation FAILED:", err);
    await pool.end().catch(() => undefined);
    redis.disconnect();
    process.exit(1);
  });
