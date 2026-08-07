// ─────────────────────────────────────────────────────────────
// Context passport + rescue service.
//
// Passports map to prompt sessions (apps/api/src/routes/sessions).
// Rescue reports come from the real rescue pipeline
// (apps/api/src/routes/rescue): paste → worker AI call → report.
// ─────────────────────────────────────────────────────────────

import {
  createRescueRequestSchema,
  createRescueResponseSchema,
  getRescueReportResponseSchema,
  listRescueReportsResponseSchema,
  listSessionsResponseSchema,
  sessionDetailResponseSchema,
  type RescueReport as RescueReportDto,
} from "@layerflow/contracts";
import { apiFetch, getServerCookieHeader } from "@/lib/api/client";
import { microToUsd } from "@/lib/api/money";
import type { ContextPassport, RescueReport } from "@/lib/types";

export interface PassportService {
  listPassports(): Promise<ContextPassport[]>;
  getPassport(id: string): Promise<ContextPassport | null>;
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

function mapSessionToPassport(session: {
  id: string;
  title: string;
  description?: string | null;
  domainId?: string | null;
  projectId?: string | null;
  status: "active" | "completed" | "paused";
  totalCostMicro: number;
  totalTokens: number;
  createdAt: string;
  updatedAt: string;
}): ContextPassport {
  return {
    id: session.id,
    title: session.title,
    fields: {
      goal: session.title,
      currentState: session.description ?? "",
      decisions: [],
      constraints: [],
      failures: [],
      successes: [],
      missingInfo: [],
      outputFormat: "",
      nextAction: "",
    },
    meta: {
      sourceTool: "generic",
      sourceModel: "unknown",
      projectId: session.projectId ?? undefined,
      tags: [],
      estimatedNextCost: microToUsd(session.totalCostMicro),
    },
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    favorite: false,
    usageCount: 0,
    wordCount: session.totalTokens > 0 ? Math.round(session.totalTokens / 1.3) : 0,
  };
}

/** DTO → dashboard RescueReport. */
export function mapRescueReport(dto: RescueReportDto): RescueReport {
  return {
    id: dto.id,
    title: dto.summary || `Rescue from ${dto.sourceTool}`,
    sourceTool: (dto.sourceTool as RescueReport["sourceTool"]) ?? "generic",
    sourceModel: dto.sourceModel,
    createdAt: dto.createdAt,
    originalWords: dto.originalWords,
    compressedWords: dto.compressedWords,
    compressionPercent: dto.compressionPercent,
    summary: dto.summary,
    passport: dto.passport,
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

export const passportService: PassportService = {
  async listPassports() {
    const res = await authedFetch("/api/sessions", listSessionsResponseSchema);
    return res.sessions.map(mapSessionToPassport);
  },

  async getPassport(id) {
    try {
      const res = await authedFetch(`/api/sessions/${id}`, sessionDetailResponseSchema);
      return mapSessionToPassport(res.session);
    } catch {
      return null;
    }
  },

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
