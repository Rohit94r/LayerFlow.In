import { expect, test } from "@playwright/test";
import {
  E2E_BASE_URL,
  fetchCurrentBudget,
  isoPeriod,
  seedMonthlyCounter,
  seedUsageRollup,
  signUpViaUi,
} from "./support/helpers";

test.describe("wedge path (sign-up → create key → request → set cap → blocked)", () => {
  test("full journey renders cost, persists a cap, and hard-blocks over budget", async ({ page }) => {
    await signUpViaUi(page);

    // ── Create a platform key — secret shown exactly once ────────────────
    await page.goto("/keys");
    await expect(page.getByRole("heading", { name: "Platform keys", exact: true })).toBeVisible();
    await page.getByPlaceholder("e.g. my laptop").fill("e2e laptop");
    await page.getByRole("button", { name: "Create key" }).click();
    await expect(page.getByText(/Key created — copy it now/)).toBeVisible();
    const secretText = await page.locator("code").filter({ hasText: "lf_live_" }).first().textContent();
    expect(secretText).toMatch(/^lf_live_[A-Za-z0-9_-]+$/);
    await expect(page.getByText("1 active")).toBeVisible();

    // ── Send a request through the gateway (the product's own key test) ──
    await page.getByRole("button", { name: /test the key/i }).click();
    await expect(page.getByText(/key-mode:/)).toBeVisible();

    // ── See cost: the costs page renders the budget panel ────────────────
    const budget0 = await fetchCurrentBudget(page);
    await seedUsageRollup(budget0.budget.workspaceId);
    await page.goto("/costs");
    await expect(page.getByText("Monthly cap")).toBeVisible();
    await expect(page.getByText(/\/ \$10\.00/)).toBeVisible();

    // ── Set the monthly cap to $1 ─────────────────────────────────────────
    await page.getByLabel("Monthly limit ($)").fill("1");
    await page.getByRole("button", { name: "Update limit" }).click();
    await expect(page.getByText("Budget limit updated.")).toBeVisible();

    // A BYOK key makes the flow hermetic: the gateway resolves a provider
    // key before the budget check, so with one present the 402 fires without
    // ever reaching an upstream provider.
    const byok = await page.request.post("/api/provider-keys", {
      data: { provider: "openai", secret: "sk-e2e-fake-0000000000000000", label: "e2e byok" },
    });
    expect(byok.ok()).toBeTruthy();

    // ── Make the block trip deterministically: seed the monthly counter ──
    const budget = await fetchCurrentBudget(page);
    await seedMonthlyCounter(budget.budget.workspaceId, isoPeriod(), 1_000_000);

    // ── The gateway now rejects requests hard (402 budget_exceeded) ──────
    await page.goto("/keys");
    await page.getByPlaceholder("e.g. my laptop").fill("e2e blocked probe");
    await page.getByRole("button", { name: "Create key" }).click();
    await expect(page.getByText(/Key created — copy it now/)).toBeVisible();
    await page.getByRole("button", { name: /test the key/i }).click();
    await expect(page.getByText(/Hard budget exceeded/)).toBeVisible();

    // ── The costs page surfaces the blocked state ─────────────────────────
    await page.goto("/costs");
    await expect(page.getByText("Hard block is on — requests are rejected once the cap is hit.")).toBeVisible();
    await expect(page.getByText("100%", { exact: true }).first()).toBeVisible();
    await expect(page).toHaveURL(/\/costs$/);
  });

  test("gateway surface is reachable with the created platform key", async ({ page }) => {
    await signUpViaUi(page);
    const created = await page.request.post("/api/keys", { data: { name: "e2e models probe" } });
    if (!created.ok()) {
      throw new Error(`POST /api/keys -> ${created.status()}: ${(await created.text()).slice(0, 200)}`);
    }
    const body = (await created.json()) as { secret: string };
    expect(body.secret).toMatch(/^lf_live_/);

    const res = await page.request.get(`${E2E_BASE_URL}/v1/models`, {
      headers: { Authorization: `Bearer ${body.secret}` },
    });
    expect(res.ok()).toBeTruthy();
    void res; // keeps the failing status/body visible in traces
    if (!res.ok()) {
      const bodyText = await res.text();
      throw new Error(`GET /v1/models -> ${res.status()}: ${bodyText.slice(0, 300)}`);
    }
  });
});