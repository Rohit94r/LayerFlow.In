import { describe, expect, it } from "vitest";
import {
  buildTrustedOrigins,
  deriveCookieDomain,
  hostCovers,
  SESSION_COOKIE_CACHE_MAX_AGE_SEC,
  SESSION_EXPIRES_IN_SEC,
  SESSION_UPDATE_AGE_SEC,
  sharedParentDomain,
} from "./config";

describe("auth session TTL constants", () => {
  it("keeps a multi-week persistent session with daily sliding refresh", () => {
    expect(SESSION_EXPIRES_IN_SEC).toBe(60 * 60 * 24 * 30);
    expect(SESSION_UPDATE_AGE_SEC).toBe(60 * 60 * 24);
    expect(SESSION_COOKIE_CACHE_MAX_AGE_SEC).toBe(5 * 60);
    expect(SESSION_UPDATE_AGE_SEC).toBeLessThan(SESSION_EXPIRES_IN_SEC);
  });
});

describe("auth production config helpers", () => {
  it("sharedParentDomain finds the apex for web + api subdomains", () => {
    expect(sharedParentDomain("layerflow.dev", "api.layerflow.dev")).toBe("layerflow.dev");
    expect(sharedParentDomain("app.layerflow.dev", "api.layerflow.dev")).toBe("layerflow.dev");
    expect(sharedParentDomain("localhost", "localhost")).toBe(null);
    expect(sharedParentDomain("layerflow.dev", "example.com")).toBe(null);
  });

  it("deriveCookieDomain returns .layerflow.dev in production", () => {
    expect(
      deriveCookieDomain({
        NODE_ENV: "production",
        COOKIE_DOMAIN: undefined,
        WEB_URL: "https://layerflow.dev",
        API_URL: "https://api.layerflow.dev",
      }),
    ).toBe(".layerflow.dev");
  });

  it("deriveCookieDomain is undefined for local dev (host-only cookie)", () => {
    expect(
      deriveCookieDomain({
        NODE_ENV: "development",
        COOKIE_DOMAIN: undefined,
        WEB_URL: "http://localhost:3000",
        API_URL: "http://localhost:8787",
      }),
    ).toBeUndefined();
  });

  it("deriveCookieDomain honors an explicit COOKIE_DOMAIN and adds the dot", () => {
    expect(
      deriveCookieDomain({
        NODE_ENV: "production",
        COOKIE_DOMAIN: "layerflow.dev",
        WEB_URL: "https://layerflow.dev",
        API_URL: "https://api.layerflow.dev",
      }),
    ).toBe(".layerflow.dev");
  });

  it("deriveCookieDomain stays host-only when hosts share no parent", () => {
    expect(
      deriveCookieDomain({
        NODE_ENV: "production",
        COOKIE_DOMAIN: undefined,
        WEB_URL: "https://layerflow.dev",
        API_URL: "https://layerflow-api.fly.dev",
      }),
    ).toBeUndefined();
  });

  it("deriveCookieDomain refuses a stale COOKIE_DOMAIN that does not cover the web host", () => {
    // Stale env from a hosting migration — .onrender.com cannot be the Domain
    // of a layerflow.dev cookie; browsers would reject every Set-Cookie and
    // users would be logged out on the next request.
    expect(
      deriveCookieDomain({
        NODE_ENV: "production",
        COOKIE_DOMAIN: "onrender.com",
        WEB_URL: "https://layerflow.dev",
        API_URL: "https://layerflow-api.onrender.com",
      }),
    ).toBeUndefined();
    expect(
      deriveCookieDomain({
        NODE_ENV: "production",
        COOKIE_DOMAIN: "layerflow-api.onrender.com",
        WEB_URL: "https://layerflow.dev",
        API_URL: "https://layerflow-api.onrender.com",
      }),
    ).toBeUndefined();
  });

  it("deriveCookieDomain keeps a valid explicit COOKIE_DOMAIN for the web host", () => {
    expect(
      deriveCookieDomain({
        NODE_ENV: "production",
        COOKIE_DOMAIN: ".layerflow.dev",
        WEB_URL: "https://www.layerflow.dev",
        API_URL: "https://api.layerflow.dev",
      }),
    ).toBe(".layerflow.dev");
  });

  it("hostCovers accepts the apex and subdomains only", () => {
    expect(hostCovers(".layerflow.dev", "layerflow.dev")).toBe(true);
    expect(hostCovers(".layerflow.dev", "www.layerflow.dev")).toBe(true);
    expect(hostCovers(".layerflow.dev", "layerflow.com")).toBe(false);
    expect(hostCovers(".onrender.com", "layerflow.dev")).toBe(false);
    expect(hostCovers("layerflow.dev", "api.layerflow.dev")).toBe(true);
  });

  it("buildTrustedOrigins dedupes and includes web + api origins", () => {
    const origins = buildTrustedOrigins({
      NODE_ENV: "production",
      CORS_ORIGINS: ["https://layerflow.dev", "https://layerflow.dev"],
      WEB_URL: "https://layerflow.dev",
      API_URL: "https://api.layerflow.dev",
    });
    expect(origins).toEqual(["https://layerflow.dev", "https://api.layerflow.dev"]);
  });

  it("buildTrustedOrigins adds localhost and 127.0.0.1 in development", () => {
    const origins = buildTrustedOrigins({
      NODE_ENV: "development",
      CORS_ORIGINS: ["http://localhost:3000"],
      WEB_URL: "http://localhost:3000",
      API_URL: "http://localhost:8787",
    });
    expect(origins).toContain("http://localhost:3000");
    expect(origins).toContain("http://127.0.0.1:3000");
    expect(origins).toContain("http://localhost:8787");
  });
});
