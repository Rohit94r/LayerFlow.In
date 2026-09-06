// ─────────────────────────────────────────────────────────────
// Rescue service — repository-style API for rescue reports
// (apps/api/src/routes/rescue). A rescue report carries the
// AI-extracted conversation summary (`context` jsonb): goal,
// currentState, decisions, constraints, failures, successes,
// missingInfo, outputFormat, nextAction, plus the diff, costs,
// improved prompt and continue pack.
// ─────────────────────────────────────────────────────────────

import {
  createRescueRequestSchema,
  createRescueResponseSchema,
  getRescueReportResponseSchema,
  listRescueReportsResponseSchema,
  type RescueReport as RescueReportDto,
} from "@layerflow/contracts";
import { apiFetch, getServerCookieHeader } from "@/lib/api/client";
import { PROVIDER_LABELS } from "@/lib/data/providers";
import type { RescueReport } from "@/lib/types";

export interface RescueService {
  listRescueReports(): Promise<RescueReport[]>;
  getRescueReport(id: string): Promise<RescueReport | null>;
  createRescue(input: {
    content: string;
    sourceTool: string;
    targetModel?: string;
    projectId?: string;
  }): Promise<RescueReport>;
}

async function authedFetch<T>(path: string, schema?: import("zod").ZodType<T>): Promise<T> {
  const headers = await getServerCookieHeader();
  return apiFetch<T>(path, { ...(headers.Cookie ? { headers } : {}) }, schema);
}

/** DTO → dashboard RescueReport. */
export function mapRescueReport(dto: RescueReportDto): RescueReport {
  return {
    id: dto.id,
    title: dto.summary || `Rescue from ${PROVIDER_LABELS[dto.sourceTool] ?? dto.sourceTool}`,
    status: dto.status,
    errorMessage: dto.errorMessage ?? undefined,
    sourceTool: (dto.sourceTool as RescueReport["sourceTool"]) ?? "generic",
    sourceModel: dto.sourceModel,
    createdAt: dto.createdAt,
    originalWords: dto.originalWords,
    compressedWords: dto.compressedWords,
    compressionPercent: dto.compressionPercent,
    summary: dto.summary,
    context: dto.context,
    improvedPrompt: dto.improvedPrompt,
    promptScore: dto.promptScore ?? 0,
    promptScores: dto.promptScores,
    diff: dto.diff,
    costs: dto.costs,
    recommendedModelId: dto.recommendedModelId,
    recommendedReason: dto.recommendedReason,
    continuePack: dto.continuePack,
    saved: dto.saved,
    projectId: dto.projectId ?? undefined,
  };
}

export const rescueService: RescueService = {
  async listRescueReports() {
    const res = await authedFetch("/api/rescue?limit=30", listRescueReportsResponseSchema);
    return res.reports.filter((r) => r.status === "completed").map(mapRescueReport);
  },

  async getRescueReport(id) {
    try {
      const res = await authedFetch(`/api/rescue/${id}`, getRescueReportResponseSchema);
      return mapRescueReport(res.report);
    } catch {
      return null;
    }
  },

  async createRescue(input) {
    const headers = await getServerCookieHeader();
    const res = await apiFetch(
      "/api/rescue",
      {
        method: "POST",
        body: createRescueRequestSchema.parse(input),
        ...(headers.Cookie ? { headers } : {}),
      },
      createRescueResponseSchema,
    );
    return mapRescueReport(res.report);
  },
};