import { apiErrorSchema, type ApiError } from "@layerflow/contracts";
import type { z } from "zod";
import { getApiBaseUrl } from "./config";

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly body: ApiError | null;

  constructor(status: number, code: string, message: string, body: ApiError | null = null) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.body = body;
  }

  get isUnauthorized(): boolean {
    return this.status === 401 || this.code === "unauthorized";
  }

  get isBudgetExceeded(): boolean {
    return this.status === 402 || this.code === "budget_exceeded";
  }
}

export type ApiRequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  signal?: AbortSignal;
  /** Skip JSON parse (e.g. empty 204). */
  parseJson?: boolean;
};

function buildUrl(path: string, query?: ApiRequestOptions["query"]): string {
  const base = getApiBaseUrl();
  const url = new URL(path.startsWith("http") ? path : `${base}${path.startsWith("/") ? path : `/${path}`}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function parseError(res: Response): Promise<ApiClientError> {
  let body: ApiError | null = null;
  let message = res.statusText || `Request failed (${res.status})`;
  let code = `http_${res.status}`;
  try {
    const json: unknown = await res.json();
    const parsed = apiErrorSchema.safeParse(json);
    if (parsed.success) {
      body = parsed.data;
      message = parsed.data.error.message;
      code = parsed.data.error.code;
    }
  } catch {
    // non-JSON error body
  }
  return new ApiClientError(res.status, code, message, body);
}

/**
 * Typed fetch wrapper for the Hono API.
 * Always sends credentials so the Better Auth session cookie is included.
 */
export async function apiFetch<T>(
  path: string,
  options: ApiRequestOptions = {},
  schema?: z.ZodType<T>,
): Promise<T> {
  const { method = "GET", body, query, signal, parseJson = true } = options;
  const headers: HeadersInit = {
    Accept: "application/json",
  };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(buildUrl(path, query), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: "include",
    signal,
  });

  if (!res.ok) {
    throw await parseError(res);
  }

  if (!parseJson || res.status === 204) {
    return undefined as T;
  }

  const json: unknown = await res.json();
  if (schema) {
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      throw new ApiClientError(
        500,
        "invalid_response",
        `Unexpected API response shape for ${path}`,
      );
    }
    return parsed.data;
  }
  return json as T;
}

export function toQuery(params: Record<string, string | number | boolean | undefined | null>) {
  return params;
}
