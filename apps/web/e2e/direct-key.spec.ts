import { expect, test } from "@playwright/test";
import { E2E_BASE_URL, signUpViaUi } from "./support/helpers";

const DIRECT_PROVIDER_KEY = process.env.E2E_DIRECT_PROVIDER_KEY;

test.describe("gateway direct/no-store keys (opt-in, live provider)", () => {
  test("direct keys use x-lf-key-mode: direct and a per-request provider key", async ({ page }) => {
    const providerKey = DIRECT_PROVIDER_KEY;
    test.skip(!providerKey, "set E2E_DIRECT_PROVIDER_KEY (e.g. an OpenAI key) to exercise direct mode against a live provider");
    const liveKey = providerKey ?? "unreachable";
    await signUpViaUi(page);

    const created = await page.request.post("/api/keys", { data: { name: "e2e direct probe" } });
    expect(created.ok()).toBeTruthy();
    const createdBody = (await created.json()) as { secret: string };
    expect(createdBody.secret).toMatch(/^lf_live_/);

    const body = {
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "ping" }],
      max_tokens: 8,
    };

    const sendDirect = (providerKey: string) =>
      page.request.post(`${E2E_BASE_URL}/v1/chat/completions`, {
        headers: {
          Authorization: `Bearer ${createdBody.secret}`,
          "x-lf-provider-key": providerKey,
          "x-lf-provider": "openai",
        },
        data: body,
      });

    const first = await sendDirect(liveKey);
    expect(first.ok()).toBeTruthy();
    expect(first.headers()["x-lf-key-mode"]).toBe("direct");
  });
});