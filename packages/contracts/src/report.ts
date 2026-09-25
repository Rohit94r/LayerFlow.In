import { z } from "zod";
import { idSchema } from "./common";

const reportDaySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** GET /api/report/costs — per-project cost report (CSV). */
export const costReportQuerySchema = z.object({
  format: z.enum(["csv", "json"]).default("csv"),
  from: reportDaySchema.optional(),
  to: reportDaySchema.optional(),
  projectId: idSchema.optional(),
});

export type CostReportQuery = z.infer<typeof costReportQuerySchema>;

/** One CSV output row — one ledger call, or an aggregate when grouped. */
export interface CostReportRow {
  date: string;
  project: string;
  provider: string;
  model: string;
  source: string;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export type CostReportFormat = "csv" | "json";