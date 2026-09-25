import type { CostReportQuery, CostReportRow } from "@layerflow/contracts";
import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "../../db/client";
import { usageLedger } from "../../db/schema/cost";
import { AppError } from "../../middleware/app-error";

/** Default report window: the current UTC month, up to today. */
function defaultRange(): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString().slice(0, 10);
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
  return { from, to };
}

const UNGROUPED = "Ungrouped";

export interface CostReportResult {
  from: string;
  to: string;
  rows: CostReportRow[];
}

export async function getCostReport(
  workspaceId: string,
  query: CostReportQuery,
): Promise<CostReportResult> {
  const { from, to } = {
    from: query.from ?? defaultRange().from,
    to: query.to ?? defaultRange().to,
  };

  // Resolve project names. A projectId that isn't in this workspace is a 404
  // so cross-workspace ids can't be probed by brute force.
  const nameMap = new Map<string, string>();
  if (query.projectId) {
    const [proj] = await db.query.projects.findMany({
      where: (p, { and, eq }) => and(eq(p.workspaceId, workspaceId), eq(p.id, query.projectId!)),
      limit: 1,
    });
    if (!proj) {
      throw new AppError(404, "project_not_found", "Project not found in this workspace");
    }
    nameMap.set(proj.id, proj.name);
  } else {
    const projs = await db.query.projects.findMany({
      where: (p, { eq }) => eq(p.workspaceId, workspaceId),
    });
    for (const p of projs) nameMap.set(p.id, p.name);
  }

  const conds = [
    eq(usageLedger.workspaceId, workspaceId),
    gte(usageLedger.createdAt, new Date(`${from}T00:00:00.000Z`)),
    lte(usageLedger.createdAt, new Date(`${to}T23:59:59.999Z`)),
  ];
  if (query.projectId) conds.push(eq(usageLedger.projectId, query.projectId));

  const ledger = await db.query.usageLedger.findMany({ where: and(...conds) });

  // Aggregate to (date, project, provider, model, source) rows.
  const rowsByKey = new Map<string, CostReportRow>();
  for (const l of ledger) {
    const date = l.createdAt.toISOString().slice(0, 10);
    const key = [date, l.projectId ?? "", l.provider, l.model, l.source].join("|");
    const prev = rowsByKey.get(key);
    if (prev) {
      prev.requests += 1;
      prev.inputTokens += l.inputTokens;
      prev.outputTokens += l.outputTokens;
      prev.costUsd += l.costMicro / 1_000_000;
    } else {
      rowsByKey.set(key, {
        date,
        project: l.projectId ? nameMap.get(l.projectId) ?? l.projectId : UNGROUPED,
        provider: l.provider,
        model: l.model,
        source: l.source,
        requests: 1,
        inputTokens: l.inputTokens,
        outputTokens: l.outputTokens,
        costUsd: l.costMicro / 1_000_000,
      });
    }
  }

  const rows = [...rowsByKey.values()].sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      a.project.localeCompare(b.project) ||
      a.provider.localeCompare(b.provider) ||
      a.model.localeCompare(b.model),
  );

  return { from, to, rows };
}

/** One aggregated ledger row → one CSV line (quoted/escaped). */
function csvCell(value: string | number): string {
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const COST_REPORT_CSV_HEADER =
  "date,project,provider,model,source,requests,input_tokens,output_tokens,cost_usd";

/** Render report rows as RFC-4180 CSV (cost in USD, 6dp micro-dollar math). */
export function costReportCsv(rows: CostReportRow[]): string {
  const lines = [COST_REPORT_CSV_HEADER];
  for (const row of rows) {
    lines.push(
      [
        row.date,
        csvCell(row.project),
        csvCell(row.provider),
        csvCell(row.model),
        csvCell(row.source),
        row.requests,
        row.inputTokens,
        row.outputTokens,
        row.costUsd.toFixed(6),
      ].join(","),
    );
  }
  return lines.join("\n") + "\n";
}