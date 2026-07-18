import type { Run, RunDetail } from "@layerflow/contracts";
import type { runs } from "../../db/schema/runs";

type RunRow = typeof runs.$inferSelect;

export function toRunDto(row: RunRow): Run {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    promptVersionId: row.promptVersionId,
    source: row.source,
    provider: row.provider,
    model: row.model,
    status: row.status,
    inputTokens: row.inputTokens,
    outputTokens: row.outputTokens,
    costMicro: row.costMicro,
    latencyMs: row.latencyMs,
    cacheHit: row.cacheHit,
    routingReason: row.routingReason,
    errorMessage: row.errorMessage,
    requestId: row.requestId,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toRunDetailDto(row: RunRow): RunDetail {
  return {
    ...toRunDto(row),
    output: row.output,
  };
}
