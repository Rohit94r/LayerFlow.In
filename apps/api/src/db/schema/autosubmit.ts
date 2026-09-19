import { index, pgTable, text, jsonb, boolean } from "drizzle-orm/pg-core";
import { idColumn, timestamps } from "./_helpers";
import { users } from "./auth";
import { workspaces } from "./tenancy";

/**
 * User Profile stored for AutoSubmit feature.
 * Contains student/personal information used to auto-populate forms.
 */
export const userProfiles = pgTable(
  "user_profiles",
  {
    id: idColumn("uprof"),
    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    fullName: text("full_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    collegeName: text("college_name"),
    rollNumber: text("roll_number"),
    branchDepartment: text("branch_department"),
    graduationYear: text("graduation_year"),
    bioDetails: text("bio_details"),
    customFields: jsonb("custom_fields").$type<Record<string, string>>().default({}),
    ...timestamps,
  },
  (t) => [index("user_profiles_user_id_idx").on(t.userId)],
);

/**
 * Form Submissions log for AutoSubmit feature.
 * Tracks every automated submission, target URL, status, and email confirmation.
 */
export const formSubmissions = pgTable(
  "form_submissions",
  {
    id: idColumn("fsub"),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    formUrl: text("form_url").notNull(),
    prompt: text("prompt"),
    status: text("status")
      .$type<"pending" | "processing" | "completed" | "failed">()
      .notNull()
      .default("pending"),
    resultSummary: text("result_summary"),
    emailNotificationSent: boolean("email_notification_sent").notNull().default(false),
    errorMessage: text("error_message"),
    ...timestamps,
  },
  (t) => [
    index("form_submissions_workspace_id_idx").on(t.workspaceId),
    index("form_submissions_user_id_idx").on(t.userId),
  ],
);
