import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { ZodError } from "zod";
import { logger } from "../config/logger";

/** Throw anywhere in a route; the global handler turns it into a JSON error. */
export class AppError extends Error {
  constructor(
    public status: ContentfulStatusCode,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

function errorBody(code: string, message: string) {
  return { error: { code, message } };
}

/** Global error handler — every error becomes { error: { code, message } }. */
export function handleError(err: Error, c: Context) {
  const requestId = c.get("requestId") as string | undefined;

  if (err instanceof AppError) {
    return c.json(errorBody(err.code, err.message), err.status);
  }
  if (err instanceof ZodError) {
    const message = err.issues
      .map((i) => `${i.path.join(".") || "body"}: ${i.message}`)
      .join("; ");
    return c.json(errorBody("validation_error", message), 400);
  }
  if (err instanceof HTTPException) {
    return c.json(errorBody("http_error", err.message), err.status as ContentfulStatusCode);
  }

  logger.error({ err, requestId, path: c.req.path }, "unhandled error");
  return c.json(errorBody("internal_error", "Something went wrong"), 500);
}

/** 404 for unknown routes, in the same error shape. */
export function handleNotFound(c: Context) {
  return c.json(errorBody("not_found", `No route for ${c.req.method} ${c.req.path}`), 404);
}
