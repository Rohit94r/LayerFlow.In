import { Hono } from "hono";
import { z } from "zod";
import type { AppEnv } from "../types";
import { requireApiKey } from "../middleware/api-key-auth";
import { buildCurrentBudgetResponse, updateCurrentBudget } from "../services/budgets/current";
import { getUsageSummary } from "../services/budgets/usage";
import { db } from "../db/client";
import { projects } from "../db/schema/workspace";
import { eq } from "drizzle-orm";

/**
 * LayerFlow MCP server.
 *
 * Implements the MCP tools subset over plain JSON-RPC 2.0 over HTTP (the
 * "stateless HTTP" shape consumed by Claude Code, Cursor and the `lf` CLI).
 * A single POST endpoint:
 *
 *   POST /api/mcp
 *   Authorization: Bearer lf_live_...
 *   {"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"layerflow_get_budget","arguments":{}}}
 *
 * Tools let an agent read this month's spend / budget and raise the cap, so
 * projects that bust a budget cap can be surfaced and un-blocked without
 * leaving the chat.
 */

const PROTOCOL_VERSION = "2025-03-26";
const SERVER_VERSION = "0.1.0";

type JsonRpcRequest = {
  jsonrpc?: string;
  id?: number | string | null;
  method?: string;
  params?: Record<string, unknown>;
};

function result(id: JsonRpcRequest["id"], res: unknown) {
  return { jsonrpc: "2.0", id: id ?? null, result: res } as const;
}

function error(id: JsonRpcRequest["id"], code: number, message: string) {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message } } as const;
}

const toUsd = (micro: number) => Number((micro / 1_000_000).toFixed(6));

function budgetPayload(res: Awaited<ReturnType<typeof buildCurrentBudgetResponse>>) {
  return {
    period: res.budget.period,
    monthlyLimitUsd: toUsd(res.budget.monthlyLimitMicro),
    dailyLimitUsd: res.budget.dailyLimitMicro != null ? toUsd(res.budget.dailyLimitMicro) : null,
    spentUsd: toUsd(res.budget.spentMicro),
    remainingUsd: toUsd(res.remainingMicro),
    percentUsed: Number(res.percentUsed.toFixed(2)),
    hardBlock: res.budget.hardBlock,
    alertAtPct: res.budget.alertAtPct,
    blocked: res.blocked,
  };
}

const toolInputSchemas = {
  layerflow_get_budget: {
    type: "object" as const,
    properties: {},
    additionalProperties: false,
  },
  layerflow_set_monthly_budget: {
    type: "object" as const,
    properties: {
      monthlyLimitUsd: { type: "number" as const, description: "New monthly budget cap in USD" },
      hardBlock: {
        type: "boolean" as const,
        description: "Hard block requests once the cap is reached (default true)",
      },
      alertAtPct: {
        type: "number" as const,
        description: "Alert threshold percent (default 80)",
      },
    },
    required: ["monthlyLimitUsd"] as string[],
    additionalProperties: false,
  },
  layerflow_get_spend_summary: {
    type: "object" as const,
    properties: {
      from: { type: "string" as const, description: "YYYY-MM-DD start (default: 30 days ago)" },
      to: { type: "string" as const, description: "YYYY-MM-DD end (default: today)" },
      groupBy: {
        type: "string" as const,
        description: "day, project, model or key",
        enum: ["day", "project", "model", "key"] as const,
      },
    },
    additionalProperties: false,
  },
  layerflow_list_projects: {
    type: "object" as const,
    properties: {},
    additionalProperties: false,
  },
} as const;

const setBudgetSchema = z.object({
  monthlyLimitUsd: z.number().positive().max(10_000_000),
  hardBlock: z.boolean().optional(),
  alertAtPct: z.number().min(1).max(100).optional(),
});

const spendSummarySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  groupBy: z.enum(["day", "project", "model", "key"]).optional(),
});

export const mcpRouter = new Hono<AppEnv>();

mcpRouter.use("/", requireApiKey);

mcpRouter.get("/health", (c) => c.json({ status: "ok", server: "layerflow-mcp", version: SERVER_VERSION }));

mcpRouter.post("/", async (c) => {
  const workspaceId = c.get("workspaceId");

  let req: JsonRpcRequest;
  try {
    req = (await c.req.json()) as JsonRpcRequest;
  } catch {
    return c.json(error(null, -32700, "Parse error: expected a JSON-RPC 2.0 object"), 400);
  }

  const id = req.id;
  const method = req.method;

  switch (method) {
    case undefined:
      return c.json(error(id, -32600, "Invalid Request: missing method"), 400);

    case "initialize":
      return c.json(
        result(id, {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: "layerflow", version: SERVER_VERSION },
        }),
      );

    case "notifications/initialized":
      // MCP notifications carry no id and are acknowledged with an empty 202.
      return c.body(null, 202);

    case "ping":
      return c.json(result(id, {}));

    case "tools/list":
      return c.json(
        result(id, {
          tools: [
            {
              name: "layerflow_get_budget",
              description:
                "Return the current monthly budget and spend for this workspace (USD). Use this before raising a cap.",
              inputSchema: toolInputSchemas.layerflow_get_budget,
            },
            {
              name: "layerflow_set_monthly_budget",
              description:
                "Raise (or lower) the workspace monthly budget cap and its hard-block / alert settings.",
              inputSchema: toolInputSchemas.layerflow_set_monthly_budget,
            },
            {
              name: "layerflow_get_spend_summary",
              description:
                "Return request/token/cost totals for this workspace over a date window, optionally grouped by day, project, model or API key.",
              inputSchema: toolInputSchemas.layerflow_get_spend_summary,
            },
            {
              name: "layerflow_list_projects",
              description:
                "List projects for this workspace (id + name), handy for constraining spend summaries.",
              inputSchema: toolInputSchemas.layerflow_list_projects,
            },
          ],
        }),
      );

    case "tools/call": {
      const params = (req.params ?? {}) as { name?: string; arguments?: unknown };
      const name = params.name;

      try {
        let text: string;
        switch (name) {
          case "layerflow_get_budget": {
            const res = await buildCurrentBudgetResponse(workspaceId);
            text = JSON.stringify(budgetPayload(res), null, 2);
            break;
          }
          case "layerflow_set_monthly_budget": {
            const parsed = setBudgetSchema.safeParse(params.arguments ?? {});
            if (!parsed.success) {
              return c.json(
                result(id, {
                  content: [
                    {
                      type: "text",
                      text: `Invalid arguments: ${parsed.error.issues.map((i) => i.message).join("; ")}`,
                    },
                  ],
                  isError: true,
                }),
              );
            }
            const res = await updateCurrentBudget(workspaceId, {
              monthlyLimitMicro: Math.round(parsed.data.monthlyLimitUsd * 1_000_000),
              ...(parsed.data.hardBlock !== undefined ? { hardBlock: parsed.data.hardBlock } : {}),
              ...(parsed.data.alertAtPct !== undefined ? { alertAtPct: parsed.data.alertAtPct } : {}),
            });
            text = JSON.stringify(budgetPayload(res), null, 2);
            break;
          }
          case "layerflow_get_spend_summary": {
            const parsed = spendSummarySchema.safeParse(params.arguments ?? {});
            if (!parsed.success) {
              return c.json(
                result(id, {
                  content: [
                    {
                      type: "text",
                      text: `Invalid arguments: ${parsed.error.issues.map((i) => i.message).join("; ")}`,
                    },
                  ],
                  isError: true,
                }),
              );
            }
            const summary = await getUsageSummary(workspaceId, {
              from: parsed.data.from,
              to: parsed.data.to,
              groupBy: parsed.data.groupBy ?? "day",
            });
            const totals = summary.buckets.reduce(
              (acc, b) => {
                acc.requests += b.requests;
                acc.inputTokens += b.inputTokens;
                acc.outputTokens += b.outputTokens;
                acc.costMicro += b.costMicro;
                return acc;
              },
              { requests: 0, inputTokens: 0, outputTokens: 0, costMicro: 0 },
            );
            text = JSON.stringify(
              {
                from: parsed.data.from,
                to: parsed.data.to,
                groupBy: parsed.data.groupBy ?? "day",
                source: summary.source,
                totals: {
                  requests: totals.requests,
                  inputTokens: totals.inputTokens,
                  outputTokens: totals.outputTokens,
                  costUsd: toUsd(totals.costMicro),
                },
                buckets: summary.buckets.map((b) => ({
                  day: b.day,
                  projectId: b.projectId,
                  model: b.model,
                  apiKeyId: b.apiKeyId,
                  requests: b.requests,
                  inputTokens: b.inputTokens,
                  outputTokens: b.outputTokens,
                  costUsd: toUsd(b.costMicro),
                })),
              },
              null,
              2,
            );
            break;
          }
          case "layerflow_list_projects": {
            const rows = await db.query.projects.findMany({
              where: eq(projects.workspaceId, workspaceId),
              orderBy: (p, { asc }) => [asc(p.name)],
            });
            text = JSON.stringify(
              rows.map((p) => ({ id: p.id, name: p.name })),
              null,
              2,
            );
            break;
          }
          default:
            return c.json(
              error(id, -32602, `Unknown tool "${name}". Use tools/list to enumerate available tools.`),
            );
        }
        return c.json(
          result(id, {
            content: [{ type: "text", text }],
            isError: false,
          }),
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return c.json(
          result(id, {
            content: [{ type: "text", text: `LayerFlow error: ${message}` }],
            isError: true,
          }),
        );
      }
    }

    default:
      return c.json(error(id, -32601, `Method not found: ${method}`));
  }
});