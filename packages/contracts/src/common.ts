import { z } from "zod";

/** Entity IDs are opaque strings (prefixed, e.g. "ws_..."). */
export const idSchema = z.string().min(1);

/** Timestamps travel over the wire as ISO-8601 strings. */
export const timestampSchema = z.iso.datetime();

/** Money is always integer micro-dollars ($1 = 1_000_000). Never floats. */
export const microDollarsSchema = z.number().int().nonnegative();

/** Standard JSON error shape returned by the API for every error. */
export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

export type ApiError = z.infer<typeof apiErrorSchema>;

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
