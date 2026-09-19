import { z } from "zod";
import { apiFetch } from "@/lib/api/client";

export const deviceCommandSchema = z.object({
  id: z.string(),
  workspace_id: z.string(),
  user_id: z.string().nullable(),
  device_id: z.string().nullable(),
  command: z.string(),
  cwd: z.string().nullable(),
  status: z.enum(["pending", "running", "succeeded", "failed", "cancelled"]),
  exit_code: z.number().nullable(),
  output: z.string(),
  error_message: z.string().nullable(),
  started_at: z.string().nullable(),
  completed_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type DeviceCommand = z.infer<typeof deviceCommandSchema>;

const listCommandsSchema = z.object({
  commands: z.array(deviceCommandSchema),
});

export const terminalService = {
  listCommands: async (opts: { limit?: number } = {}) =>
    apiFetch(
      "/api/v1/terminal/commands",
      { query: { limit: opts.limit } },
      listCommandsSchema,
    ),

  createCommand: async (input: { command: string; device_id?: string | null }) =>
    apiFetch(
      "/api/v1/terminal/commands",
      {
        method: "POST",
        body: { command: input.command, device_id: input.device_id ?? null },
      },
      z.object({ command: deviceCommandSchema }),
    ),

  cancelCommand: async (id: string) =>
    apiFetch(
      `/api/v1/terminal/commands/${id}/cancel`,
      { method: "POST" },
      z.object({ command: deviceCommandSchema }),
    ),
};