import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Page } from "@playwright/test";
import Redis from "ioredis";
import { Client } from "pg";
import type { CurrentBudgetResponse } from "@layerflow/contracts";

// Tests run from apps/web (npx playwright / npm --workspace), so cwd is the
// workspace root; the repo root is one level up.
const root = resolve(process.cwd(), "../..");

export function loadApiEnv(): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    for (const line of readFileSync(resolve(root, "apps/api/.env"), "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (key) out[key] = value;
    }
  } catch {
    // No .env file — fall back to the process environment below.
  }
  return out;
}

export function apiEnvVar(name: string): string | undefined {
  return process.env[name] ?? loadApiEnv()[name];
}

export const E2E_BASE_URL = `http://localhost:${process.env.E2E_WEB_PORT ?? "3100"}`;

const stamp = Date.now().toString(36);
let userSeq = 0;

export interface E2EUser {
  name: string;
  email: string;
  password: string;
}

export function freshUser(): E2EUser {
  userSeq += 1;
  return {
    name: "E2E Explorer",
    email: `e2e.${stamp}.${userSeq}@layerflow.dev`,
    password: "E2E-pass-12345",
  };
}

export function isoPeriod(date = new Date()): string {
  return date.toISOString().slice(0, 7);
}

export async function signUpViaUi(page: Page, user: E2EUser = freshUser()): Promise<void> {
  await page.goto("/sign-in");
  await page.getByRole("button", { name: "Create one" }).click();
  await page.getByLabel("Name", { exact: true }).fill(user.name);
  await page.getByLabel("Email", { exact: true }).fill(user.email);
  await page.getByLabel("Password", { exact: true }).fill(user.password);
  await page.getByLabel("Confirm password", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await page.goto("/home");
  await page.waitForURL(/\/home$/);
}

export async function fetchCurrentBudget(page: Page): Promise<CurrentBudgetResponse> {
  const res = await page.request.get("/api/budgets/current");
  if (!res.ok()) throw new Error(`GET /api/budgets/current failed: ${res.status()} ${await res.text()}`);
  return (await res.json()) as CurrentBudgetResponse;
}

/** Seed the workspace monthly Redis counter so the hard block trips. */
export async function seedMonthlyCounter(workspaceId: string, period: string, spentMicro: number): Promise<void> {
  const url = apiEnvVar("REDIS_URL") ?? "redis://127.0.0.1:6379";
  const redis = new Redis(url, { maxRetriesPerRequest: 2 });
  try {
    await redis.set(`budget:${workspaceId}:monthly:${period}`, String(spentMicro));
  } finally {
    await redis.quit();
  }
}

/** E2E-only id: usage_rollups.id has no DB default, so raw inserts must supply one. */
const e2eSeq = { n: 0 };
function e2eId(prefix: string): string {
  e2eSeq.n += 1;
  return `${prefix}_${process.pid.toString(36)}${e2eSeq.n.toString(36)}${Date.now().toString(36)}`.slice(0, 33);
}

/**
 * Insert a usage_rollups row for today so the costs page renders the full
 * dashboard (it early-returns "No spend yet" while total spend is zero).
 * Rollups take precedence over the ledger in /api/usage/summary.
 */
export async function seedUsageRollup(workspaceId: string): Promise<void> {
  const url = apiEnvVar("DATABASE_URL");
  if (!url) throw new Error("DATABASE_URL missing — cannot seed usage rollup");
  const day = new Date().toISOString().slice(0, 10);
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await client.query(
      `insert into usage_rollups
         (id, workspace_id, day, model, requests, input_tokens, output_tokens, cost_micro, created_at, updated_at)
       values ($1, $2, $3, $4, 2, 40, 12, 500000, now(), now())`,
      [e2eId("ur"), workspaceId, day, "gpt-4o-mini"],
    );
  } finally {
    await client.end();
  }
}