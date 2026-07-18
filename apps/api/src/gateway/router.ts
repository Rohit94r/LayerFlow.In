import { computeCostMicro } from "@layerflow/model-registry";
import {
  chatCompletionsRequestSchema,
  type ListModelsResponse,
} from "@layerflow/contracts";
import { MODELS } from "@layerflow/model-registry";
import { Hono } from "hono";
import { getExactCache, hashExactCacheKey, setExactCache } from "../cache/exact";
import { releaseBudget, reserveBudget, settleBudget } from "../budgets/enforce";
import { db } from "../db/client";
import { gatewayLogs } from "../db/schema/gateway";
import { requireApiKey } from "../middleware/api-key-auth";
import { AppError } from "../middleware/error";
import { rateLimit } from "../middleware/rate-limit";
import {
  loadProviderApiKey,
  resolveProviderFromModel,
} from "../providers";
import { listConfiguredProviders } from "../services/keys/provider-keys";
import type { AppEnv } from "../types";
import type { ChatMessage } from "../providers/types";
import { streamOpenAiCompatible } from "./providers";

export const gatewayRouter = new Hono<AppEnv>();

gatewayRouter.use(requireApiKey);
gatewayRouter.use(rateLimit({ requestsPerMinute: 60 }));

function toChatMessages(
  messages: Array<{ role: string; content?: string | null | unknown }>,
): ChatMessage[] {
  return messages.map((m) => ({
    role: (m.role === "system" || m.role === "assistant" ? m.role : "user") as ChatMessage["role"],
    content: typeof m.content === "string" ? m.content : m.content == null ? "" : JSON.stringify(m.content),
  }));
}

function estimateCostMicro(model: string, messages: ChatMessage[]): number {
  let chars = 0;
  for (const m of messages) chars += m.content.length;
  const inputTokens = Math.max(16, Math.ceil(chars / 4));
  const outputTokens = 512;
  return computeCostMicro(model, inputTokens, outputTokens) ?? 50_000;
}

async function writeGatewayLog(args: {
  workspaceId: string;
  apiKeyId?: string;
  method: string;
  path: string;
  model?: string;
  statusCode: number;
  latencyMs: number;
  errorCode?: string;
  requestId?: string;
}): Promise<void> {
  await db
    .insert(gatewayLogs)
    .values({
      workspaceId: args.workspaceId,
      apiKeyId: args.apiKeyId ?? null,
      method: args.method,
      path: args.path,
      model: args.model ?? null,
      statusCode: args.statusCode,
      latencyMs: args.latencyMs,
      errorCode: args.errorCode ?? null,
      requestId: args.requestId ?? null,
    })
    .catch(() => undefined);
}

// GET /v1/models
gatewayRouter.get("/models", async (c) => {
  const workspaceId = c.get("workspaceId");
  const configured = new Set(await listConfiguredProviders(workspaceId));
  const response: ListModelsResponse = {
    object: "list",
    data: MODELS.map((m) => ({
      id: m.id,
      object: "model" as const,
      owned_by: m.provider,
      available: configured.has(m.provider),
    })),
  };
  return c.json(response);
});

// POST /v1/chat/completions
gatewayRouter.post("/chat/completions", async (c) => {
  const started = Date.now();
  const workspaceId = c.get("workspaceId");
  const apiKeyId = c.get("apiKeyId");
  const requestId = c.get("requestId");
  const body = chatCompletionsRequestSchema.parse(await c.req.json());

  const { provider, adapter } = resolveProviderFromModel(body.model);
  const projectId = body.project_id ?? c.get("apiKeyProjectId") ?? null;
  const messages = toChatMessages(body.messages);
  const cacheKey = hashExactCacheKey(body);

  const cached = await getExactCache(workspaceId, cacheKey);
  if (cached && !body.stream) {
    await writeGatewayLog({
      workspaceId,
      apiKeyId,
      method: "POST",
      path: "/v1/chat/completions",
      model: body.model,
      statusCode: 200,
      latencyMs: Date.now() - started,
      errorCode: "cache_hit",
      requestId,
    });
    c.header("x-layerflow-cache", "hit");
    return c.json(JSON.parse(cached));
  }

  const apiKey = await loadProviderApiKey(workspaceId, provider);
  const estimateMicro = estimateCostMicro(body.model, messages);
  const reservation = await reserveBudget({
    workspaceId,
    projectId,
    apiKeyId,
    estimateMicro,
  });

  try {
    if (body.stream) {
      const upstream = await streamOpenAiCompatible(provider, apiKey, {
        model: body.model,
        messages: body.messages,
        temperature: body.temperature,
        top_p: body.top_p,
        max_tokens: body.max_tokens,
        max_completion_tokens: body.max_completion_tokens,
        stop: body.stop,
        user: body.user,
      });
      await settleBudget({
        reservationId: reservation.reservationId,
        actualMicro: estimateMicro,
        provider,
        model: body.model,
        source: "gateway",
      });
      await writeGatewayLog({
        workspaceId,
        apiKeyId,
        method: "POST",
        path: "/v1/chat/completions",
        model: body.model,
        statusCode: 200,
        latencyMs: Date.now() - started,
        requestId,
      });
      return new Response(upstream.body, {
        status: 200,
        headers: {
          "Content-Type": upstream.headers.get("Content-Type") ?? "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "x-layerflow-cache": "miss",
          "x-request-id": requestId,
        },
      });
    }

    const result = await adapter.chatCompletion({
      model: body.model,
      messages,
      apiKey,
    });

    const actualMicro =
      computeCostMicro(body.model, result.inputTokens, result.outputTokens) ?? estimateMicro;

    await settleBudget({
      reservationId: reservation.reservationId,
      actualMicro,
      provider,
      model: body.model,
      source: "gateway",
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
    });

    const completion = {
      id: `chatcmpl_${requestId}`,
      object: "chat.completion" as const,
      created: Math.floor(Date.now() / 1000),
      model: body.model,
      choices: [
        {
          index: 0,
          message: { role: "assistant", content: result.content },
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: result.inputTokens,
        completion_tokens: result.outputTokens,
        total_tokens: result.inputTokens + result.outputTokens,
      },
    };

    await setExactCache(workspaceId, cacheKey, JSON.stringify(completion));
    await writeGatewayLog({
      workspaceId,
      apiKeyId,
      method: "POST",
      path: "/v1/chat/completions",
      model: body.model,
      statusCode: 200,
      latencyMs: Date.now() - started,
      requestId,
    });

    c.header("x-layerflow-cache", "miss");
    return c.json(completion);
  } catch (err) {
    await releaseBudget({ reservationId: reservation.reservationId });
    const status = err instanceof AppError ? err.status : 500;
    const code = err instanceof AppError ? err.code : "internal_error";
    await writeGatewayLog({
      workspaceId,
      apiKeyId,
      method: "POST",
      path: "/v1/chat/completions",
      model: body.model,
      statusCode: status,
      latencyMs: Date.now() - started,
      errorCode: code,
      requestId,
    });
    throw err;
  }
});
