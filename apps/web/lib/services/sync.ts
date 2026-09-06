import { z } from "zod";
import { apiFetch, getServerCookieHeader } from "@/lib/api/client";

export const syncOperationSchema = z.object({
  op_id: z.string(),
  entity: z.string(),
  entity_id: z.string(),
  payload: z.record(z.string(), z.unknown()),
  device_id: z.string(),
  op_tick: z.number(),
  state: z.string(),
  attempts: z.number(),
  created_at: z.string(),
});
export type SyncOperation = z.infer<typeof syncOperationSchema>;

const listOperationsSchema = z.object({
  operations: z.array(syncOperationSchema),
  server_watermark: z.number(),
});

const listDevicesSchema = z.object({
  devices: z.array(
    z.object({
      id: z.string(),
      device_id: z.string(),
      name: z.string().nullable(),
      last_seen_at: z.string(),
      created_at: z.string(),
    }),
  ),
});

export const syncService = {
  operations: async (opts: { limit?: number } = {}) =>
    apiFetch(
      "/api/v1/sync/operations",
      { query: { limit: opts.limit } },
      listOperationsSchema,
    ),

  /** Server-component variant — forwards the session cookie (same-origin API). */
  operationsServer: async (opts: { limit?: number } = {}): Promise<{ operations: SyncOperation[] }> => {
    const headers = await getServerCookieHeader();
    return apiFetch(
      "/api/v1/sync/operations",
      { query: { limit: opts.limit }, ...(headers.Cookie ? { headers } : {}) },
      listOperationsSchema,
    );
  },

  devicesServer: async () => {
    const headers = await getServerCookieHeader();
    return apiFetch(
      "/api/v1/sync/devices",
      { ...(headers.Cookie ? { headers } : {}) },
      listDevicesSchema,
    );
  },

  deleteOperation: async (opId: string) =>
    apiFetch(`/api/v1/sync/operations/${opId}`, { method: "DELETE" }),
};
