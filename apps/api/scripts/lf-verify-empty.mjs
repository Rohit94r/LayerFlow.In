import pg from "pg";
const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();
const tables = await c.query(
  "select table_name from information_schema.tables where table_schema='public' order by table_name"
);
const wanted = new Set(["autosubmitQueues","autosubmitSubmissions","formSubmissions","users","workspaces","runs","chatMessages","memories"]);
let total = 0;
for (const { table_name } of tables.rows) {
  if (!wanted.has(table_name)) continue;
  const n = await c.query(`select count(*)::int as n from "${table_name}"`);
  total += n.rows[0].n;
  console.log("  " + table_name + "=" + n.rows[0].n);
}
console.log("PROD_VIABLE_ROWS_TOTAL_AFTER_CLEAR=" + total);
await c.end();
