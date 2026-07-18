import { randomBytes } from "node:crypto";
import { bigint, text, timestamp } from "drizzle-orm/pg-core";

const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";

/** Prefixed random ID, e.g. "ws_k3v9x...". Prefix makes IDs self-describing in logs. */
export function createId(prefix: string): string {
  const bytes = randomBytes(16);
  let id = "";
  for (const byte of bytes) id += ALPHABET[byte % ALPHABET.length];
  return `${prefix}_${id}`;
}

/** Primary key column with an auto-generated prefixed ID. */
export function idColumn(prefix: string) {
  return text("id")
    .primaryKey()
    .$defaultFn(() => createId(prefix));
}

/** Standard created_at / updated_at pair. */
export const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const createdAtOnly = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
};

/**
 * Money column: integer MICRO-DOLLARS ($1 = 1_000_000), never floats.
 * bigint because monthly workspace spend can exceed int4 range.
 */
export function microDollars(name: string) {
  return bigint(name, { mode: "number" });
}
