import { describe, expect, it } from "vitest";
import { isKeyUsable, KEY_REPROBE_GRACE_MS } from "./health";
import type { ProviderKeyHealthRow } from "../../db/schema/chat";

function row(overrides: Partial<ProviderKeyHealthRow>): ProviderKeyHealthRow {
  return {
    keyHint: "platform:google",
    status: "healthy",
    lastErrorCode: null,
    lastErrorMessage: null,
    lastStatusCode: null,
    lastErrorAt: null,
    cooldownUntil: null,
    lastSuccessAt: null,
    updatedAt: new Date(),
    ...overrides,
  } as ProviderKeyHealthRow;
}

const HOUR = 60 * 60 * 1000;

describe("isKeyUsable", () => {
  it("unknown rows (no health recorded) are usable", () => {
    expect(isKeyUsable(undefined)).toBe(true);
  });

  it("healthy rows are usable", () => {
    expect(isKeyUsable(row({ status: "healthy" }))).toBe(true);
  });

  it("degrading rows are usable except inside cooldown", () => {
    expect(isKeyUsable(row({ status: "degrading" }))).toBe(true);
    expect(
      isKeyUsable(
        row({
          status: "degrading",
          cooldownUntil: new Date(Date.now() + HOUR),
        }),
      ),
    ).toBe(false);
    expect(
      isKeyUsable(
        row({
          status: "degrading",
          cooldownUntil: new Date(Date.now() - HOUR),
        }),
      ),
    ).toBe(true);
  });

  it("dead/expired keys are blocked, then re-probed after the grace window", () => {
    const recent = row({
      status: "dead",
      lastErrorAt: new Date(Date.now() - 10 * 60 * 1000),
    });
    expect(isKeyUsable(recent)).toBe(false);

    const stale = row({
      status: "expired",
      lastErrorAt: new Date(Date.now() - (KEY_REPROBE_GRACE_MS + HOUR)),
    });
    expect(isKeyUsable(stale)).toBe(true);
  });

  it("dead/expired rows without lastErrorAt stay blocked", () => {
    expect(isKeyUsable(row({ status: "dead", lastErrorAt: null }))).toBe(false);
  });
});