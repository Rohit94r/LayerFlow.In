import { bigint, index, pgTable, text } from "drizzle-orm/pg-core";
import { createdAtOnly, idColumn } from "./_helpers";
import { users } from "./auth";
import { workspaces } from "./tenancy";

/** File metadata; binary content lives in R2 (or local disk in dev). */
export const files = pgTable(
  "files",
  {
    id: idColumn("file"),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    ownerUserId: text("owner_user_id").references(() => users.id, { onDelete: "set null" }),
    /** Object key in R2 / local storage. */
    objectKey: text("object_key").notNull().unique(),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
    /** SHA-256 hex of the content, for dedupe/integrity. */
    checksum: text("checksum"),
    scope: text("scope").$type<"workspace" | "public">().notNull().default("workspace"),
    ...createdAtOnly,
  },
  (t) => [index("files_workspace_id_idx").on(t.workspaceId)],
);
