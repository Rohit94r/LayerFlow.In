import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import { getApiBaseUrl, getGatewayBaseUrl } from "@/lib/api/config";
import { microToUsd, usdToMicro } from "@/lib/api/money";
import { mapBudget, initialsFromName } from "@/lib/api/mappers";
import { resolveInitialTheme, THEME_STORAGE_KEY } from "@/lib/theme";

describe("money helpers", () => {
  it("converts micro-dollars to USD and back", () => {
    expect(microToUsd(1_000_000)).toBe(1);
    expect(usdToMicro(2.5)).toBe(2_500_000);
  });
});

describe("mappers", () => {
  it("builds initials from a name", () => {
    expect(initialsFromName("Alex Chen")).toBe("AC");
    expect(initialsFromName("Ada")).toBe("AD");
  });

  it("maps current budget response to UI budget", () => {
    const budget = mapBudget({
      budget: {
        id: "bud_1",
        workspaceId: "ws_1",
        period: "2026-07",
        monthlyLimitMicro: 50_000_000,
        dailyLimitMicro: 5_000_000,
        spentMicro: 10_000_000,
        alertAtPct: 80,
        hardBlock: true,
        createdAt: "2026-07-01T00:00:00.000Z",
        updatedAt: "2026-07-01T00:00:00.000Z",
      },
      remainingMicro: 40_000_000,
      percentUsed: 20,
      blocked: false,
      dailySpentMicro: 1_000_000,
    });
    expect(budget.monthlyLimit).toBe(50);
    expect(budget.spent).toBe(10);
    expect(budget.remaining).toBe(40);
    expect(budget.dailySpent).toBe(1);
  });
});

describe("getApiBaseUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses same-origin web host on localhost even when prod NEXT_PUBLIC_API_URL is set", () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.layerflow.dev");
    expect(window.location.hostname).toMatch(/localhost|127\.0\.0\.1/);
    expect(getApiBaseUrl()).toBe(window.location.origin);
  });

  it("uses same-origin on layerflow.dev even when NEXT_PUBLIC_API_URL points at Fly", () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.layerflow.dev");
    const original = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...original, hostname: "layerflow.dev", origin: "https://layerflow.dev" },
    });
    try {
      expect(getApiBaseUrl()).toBe("https://layerflow.dev");
      expect(getGatewayBaseUrl()).toBe("https://layerflow.dev/v1");
    } finally {
      Object.defineProperty(window, "location", {
        configurable: true,
        value: original,
      });
    }
  });
});

describe("apiFetch", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8787");
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.unstubAllEnvs();
  });

  it("sends credentials and parses JSON", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const data = await apiFetch<{ ok: boolean }>("/api/health-check");
    expect(data.ok).toBe(true);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${window.location.origin}/api/health-check`,
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("throws ApiClientError on API error shape", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: { code: "budget_exceeded", message: "Over budget" },
        }),
        { status: 402, headers: { "Content-Type": "application/json" } },
      ),
    );
    await expect(apiFetch("/api/runs")).rejects.toSatisfy((err: unknown) => {
      return (
        err instanceof ApiClientError &&
        err.isBudgetExceeded &&
        err.message === "Over budget"
      );
    });
  });
});

describe("theme", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("respects saved light theme over system dark", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "light");
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
    expect(resolveInitialTheme()).toBe("light");
  });

  it("respects saved dark theme", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "dark");
    expect(resolveInitialTheme()).toBe("dark");
  });
});
