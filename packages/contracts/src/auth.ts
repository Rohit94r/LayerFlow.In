import { z } from "zod";
import { idSchema, timestampSchema } from "./common";

export const userSchema = z.object({
  id: idSchema,
  name: z.string(),
  email: z.email(),
  image: z.string().nullish(),
  createdAt: timestampSchema,
});

export type User = z.infer<typeof userSchema>;

/** Response of GET /api/auth/session (Better Auth) plus the active workspace. */
export const sessionInfoSchema = z.object({
  user: userSchema,
  activeWorkspaceId: idSchema,
});

export type SessionInfo = z.infer<typeof sessionInfoSchema>;
