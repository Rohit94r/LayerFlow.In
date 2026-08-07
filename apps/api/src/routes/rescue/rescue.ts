import { Hono } from "hono";
import {
  createRescueRequestSchema,
  listRescueReportsQuerySchema,
  type RescueReport,
} from "@layerflow/contracts";
import { db } from "../../db/client";
import { promptSessions } from "../../db/schema/sessions";
import { requireAuth } from "../../middleware/auth";
import { AppError } from "../../middleware/app-error";
import { createRescueReport, getRescueReport, listRescueReports } from "../../services/rescue/report";
import type { AppEnv } from "../../types";

export const rescueRouter = new Hono<AppEnv>();

rescueRouter.use(requireAuth);

function toReportDto(row: {
  id: string;
  workspaceId: string;
  sessionId: string | null;
  projectId: string | null;
  sourceTool: string;
  sourceModel: string;
  status: string;
  errorMessage: string | null;
  summary: string;
  passport: unknown;
  improvedPrompt: string;
  promptScore: number | null;
  promptScores: unknown;
  diff: unknown;
  costs: unknown;
  recommendedModelId: string;
  recommendedReason: string;
  continuePack: unknown;
  originalWords: number;
  compressedWords: number;
  compressionPercent: number;
  saved: number;
  createdAt: Date;
  updatedAt: Date;
}): RescueReport {
  const passport = (row.passport ?? {}) as Partial<RescueReport["passport"]>;
  const diff = (row.diff ?? {}) as Partial<RescueReport["diff"]>;
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    sessionId: row.sessionId ?? null,
    projectId: row.projectId ?? null,
    sourceTool: row.sourceTool,
    sourceModel: row.sourceModel,
    status: row.status as RescueReport["status"],
    errorMessage: row.errorMessage ?? null,
    summary: row.summary,
    // failed/queued reports have an empty JSONB cell — always emit the full
    // contract shape so the web client can render it.
    passport: {
      goal: passport.goal ?? "",
      currentState: passport.currentState ?? "",
      decisions: passport.decisions ?? [],
      constraints: passport.constraints ?? [],
      failures: passport.failures ?? [],
      successes: passport.successes ?? [],
      missingInfo: passport.missingInfo ?? [],
      outputFormat: passport.outputFormat ?? "",
      nextAction: passport.nextAction ?? "",
    },
    improvedPrompt: row.improvedPrompt,
    promptScore: row.promptScore ?? null,
    promptScores: (row.promptScores ?? []) as RescueReport["promptScores"],
    diff: {
      kept: diff.kept ?? [],
      removed: diff.removed ?? [],
      unsure: diff.unsure ?? [],
    },
    costs: (row.costs ?? []) as RescueReport["costs"],
    recommendedModelId: row.recommendedModelId,
    recommendedReason: row.recommendedReason,
    continuePack: (row.continuePack ?? []) as RescueReport["continuePack"],
    originalWords: row.originalWords,
    compressedWords: row.compressedWords,
    compressionPercent: row.compressionPercent,
    saved: row.saved === 1,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// POST /api/rescue — paste a conversation to rescue. Returns 202 with the
// queued report; the worker runs the pipeline and updates it in place.
rescueRouter.post("/", async (c) => {
  const workspaceId = c.get("workspaceId");
  const userId = c.get("userId");
  const body = createRescueRequestSchema.parse(await c.req.json());

  // Attach the paste to a session so it also lands in Passports + the ledger.
  const [session] = await db
    .insert(promptSessions)
    .values({
      workspaceId,
      projectId: body.projectId ?? null,
      domainId: body.domainId ?? null,
      title: `Rescue — ${body.sourceTool ?? "chat"}`,
      description: body.content.slice(0, 240),
      status: "active",
    })
    .returning();
  const sessionId = session.id;

  const report = await createRescueReport({
    workspaceId,
    userId,
    content: body.content,
    sourceTool: body.sourceTool ?? "generic",
    targetModel: body.targetModel,
    projectId: body.projectId,
    sessionId,
  });

  const response = { report: toReportDto(report) } satisfies import("@layerflow/contracts").CreateRescueResponse;
  return c.json(response, 202);
});

// GET /api/rescue?limit=&offset=
rescueRouter.get("/", async (c) => {
  const workspaceId = c.get("workspaceId");
  const query = listRescueReportsQuerySchema.parse(c.req.query());
  const reports = await listRescueReports(workspaceId, query.limit, query.offset);
  const response = { reports: reports.map(toReportDto) } satisfies import("@layerflow/contracts").ListRescueReportsResponse;
  return c.json(response);
});

// GET /api/rescue/:id
rescueRouter.get("/:id", async (c) => {
  const workspaceId = c.get("workspaceId");
  const report = await getRescueReport(workspaceId, c.req.param("id"));
  if (!report) throw new AppError(404, "not_found", "Rescue report not found");
  const response = { report: toReportDto(report) } satisfies import("@layerflow/contracts").GetRescueReportResponse;
  return c.json(response);
});
