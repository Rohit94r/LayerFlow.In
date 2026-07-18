import net from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type Redis from "ioredis";
import { RESERVE_LUA, ADJUST_LUA } from "./lua";
import { monthlyKey } from "./redis-keys";

/**
 * Budget Lua / reserve unit tests.
 *
 * Prefer a real Redis when reachable (`docker compose up -d`). Otherwise use
 * ioredis-mock. If neither works the suite is skipped with a clear message —
 * do not silently pass.
 */

function canConnect(host: string, port: number, timeoutMs = 1_000): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port });
    const done = (ok: boolean) => {
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(timeoutMs, () => done(false));
    socket.once("connect", () => done(true));
    socket.once("error", () => done(false));
  });
}

let redis: Redis | null = null;
let usingMock = false;
let skipReason: string | null = null;

beforeAll(async () => {
  const url = process.env.REDIS_URL ?? "redis://localhost:6379";
  const parsed = new URL(url);
  const up = await canConnect(parsed.hostname, Number(parsed.port || 6379));

  if (up) {
    const { Redis: IORedis } = await import("ioredis");
    redis = new IORedis(url, { lazyConnect: true, maxRetriesPerRequest: 1 });
    await redis.connect();
    return;
  }

  try {
    const RedisMock = (await import("ioredis-mock")).default;
    redis = new RedisMock() as unknown as Redis;
    usingMock = true;
  } catch (err) {
    skipReason = `Neither real Redis nor ioredis-mock available: ${err instanceof Error ? err.message : err}`;
    console.warn(`\n[budget] SKIPPING reserve tests — ${skipReason}\n`);
  }
});

afterAll(async () => {
  if (redis && !usingMock) {
    redis.disconnect();
  }
});

describe("budget Lua reserve/adjust", () => {
  it("skips with documentation when Redis + mock unavailable", () => {
    if (skipReason) {
      expect(skipReason).toMatch(/ioredis-mock|Redis/);
      return;
    }
    expect(redis).toBeTruthy();
  });

  it.runIf(!skipReason)("reserves when under limit", async () => {
    const client = redis!;
    const key = monthlyKey("ws_test_lua", "2099-01");
    await client.del(key);
    const result = (await client.eval(
      RESERVE_LUA,
      1,
      key,
      "100", // estimate
      "1", // hardBlock
      "1000", // limit
    )) as number;
    expect(result).toBe(1);
    expect(Number(await client.get(key))).toBe(100);
  });

  it.runIf(!skipReason)("rejects when hardBlock and over limit", async () => {
    const client = redis!;
    const key = monthlyKey("ws_test_lua_block", "2099-01");
    await client.set(key, "900");
    const result = (await client.eval(RESERVE_LUA, 1, key, "200", "1", "1000")) as number;
    expect(result).toBe(0);
    expect(Number(await client.get(key))).toBe(900); // unchanged
  });

  it.runIf(!skipReason)("allows overspend when hardBlock is off", async () => {
    const client = redis!;
    const key = monthlyKey("ws_test_lua_soft", "2099-01");
    await client.set(key, "900");
    const result = (await client.eval(RESERVE_LUA, 1, key, "200", "0", "1000")) as number;
    expect(result).toBe(1);
    expect(Number(await client.get(key))).toBe(1100);
  });

  it.runIf(!skipReason)("adjust settles estimate → actual", async () => {
    const client = redis!;
    const key = monthlyKey("ws_test_lua_settle", "2099-01");
    await client.set(key, "500"); // after reserve of 500
    await client.eval(ADJUST_LUA, 1, key, String(120 - 500)); // actual 120
    expect(Number(await client.get(key))).toBe(120);
  });
});
