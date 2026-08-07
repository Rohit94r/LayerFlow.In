import "dotenv/config";
import { hashPassword } from "better-auth/crypto";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { pool, db } from "../src/db/client";
import { users, accounts } from "../src/db/schema/auth";

/**
 * Dev helper — sets (or resets) the seeded dev account password so you can
 * sign in locally. Defaults: alex@layerflow.dev / layerflow123.
 *   npm run db:dev-login --workspace @layerflow/api [-- email password]
 */
const [, , emailArg, passwordArg] = process.argv;
const email = emailArg ?? "alex@layerflow.dev";
const password = passwordArg ?? "layerflow123";

const user = await db.query.users.findFirst({ where: eq(users.email, email) });
if (!user) {
  console.log(`No user found for ${email} — run db:seed first.`);
  await pool.end();
  process.exit(1);
}

const hash = await hashPassword(password);
const existing = await db.query.accounts.findFirst({
  where: (a, { and, eq }) =>
    and(eq(a.userId, user.id), eq(a.providerId, "credential")),
});

if (existing) {
  await db
    .update(accounts)
    .set({ password: hash })
    .where(eq(accounts.id, existing.id));
} else {
  await db.insert(accounts).values({
    id: randomUUID(),
    userId: user.id,
    providerId: "credential",
    accountId: user.id,
    password: hash,
  });
}

console.log(`Dev password set for ${email}. Sign in with password "${password}".`);
await pool.end();
