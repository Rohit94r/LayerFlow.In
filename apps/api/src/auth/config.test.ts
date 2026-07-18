import { describe, expect, it } from "vitest";
import { buildTrustedOrigins, deriveCookieDomain, sharedParentDomain } from "./config";

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

  it("buildTrustedOrigins dedupes and includes web + api origins", () => {
    const origins = buildTrustedOrigins({
      CORS_ORIGINS: ["https://layerflow.dev", "https://layerflow.dev"],
      WEB_URL: "https://layerflow.dev",
      API_URL: "https://api.layerflow.dev",
    });
    expect(origins).toEqual(["https://layerflow.dev", "https://api.layerflow.dev"]);
  });
});
