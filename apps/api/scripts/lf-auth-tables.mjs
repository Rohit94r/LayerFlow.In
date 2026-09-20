import pg from "pg";
const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();
const r = await c.query("select table_name from information_schema.tables where table_schema='public' and table_name in ('users','sessions','accounts','verificationTokens','user','session','account','verification') order by table_name");
for (const x of r.rows) console.log("  AUTH_TABLE_PRESENT=" + x.table_name);
console.log("AUTH_TABLE_COUNT=" + r.rows.length);
await c.end();
