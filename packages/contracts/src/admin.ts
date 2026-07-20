import { z } from "zod";
import { idSchema, timestampSchema } from "./common";

/** Default admin allowlist — override via ADMIN_EMAILS / NEXT_PUBLIC_ADMIN_EMAILS. */
export const DEFAULT_ADMIN_EMAILS = ["rjdhav67@gmail.com"] as const;

export const adminUserRowSchema = z.object({
  id: idSchema,
  email: z.string().email(),
  name: z.string(),
  emailVerified: z.boolean(),
  createdAt: timestampSchema,
  /** Most recent auth session start, if any. */
  lastLoginAt: timestampSchema.nullable(),
});

export type AdminUserRow = z.infer<typeof adminUserRowSchema>;

export const adminSessionRowSchema = z.object({
  id: idSchema,
  userId: idSchema,
  email: z.string().email(),
  name: z.string(),
  createdAt: timestampSchema,
  expiresAt: timestampSchema,
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
});

export type AdminSessionRow = z.infer<typeof adminSessionRowSchema>;

/** GET /api/admin/analytics */
export const adminAnalyticsResponseSchema = z.object({
  totals: z.object({
    users: z.number().int().nonnegative(),
    activeSessions: z.number().int().nonnegative(),
    usersToday: z.number().int().nonnegative(),
    usersThisWeek: z.number().int().nonnegative(),
  }),
  users: z.array(adminUserRowSchema),
  recentLogins: z.array(adminSessionRowSchema),
  generatedAt: timestampSchema,
});

export type AdminAnalyticsResponse = z.infer<typeof adminAnalyticsResponseSchema>;
