/**
 * Unit tests for SSRF protection utilities.
 *
 * Tests cover:
 * - isPrivateIp returns true for private/reserved IP ranges
 * - isPrivateIp returns false for public IPs
 * - validateUrl rejects non-HTTP(S) schemes
 * - validateUrl rejects private IP URLs
 */

import { describe, expect, it } from "vitest";
import { isPrivateIp, validateUrl } from "../services/security/ssrf";

describe("isPrivateIp", () => {
  it("returns true for 10.x.x.x range", () => {
    expect(isPrivateIp("10.0.0.1")).toBe(true);
    expect(isPrivateIp("10.255.255.255")).toBe(true);
    expect(isPrivateIp("10.1.2.3")).toBe(true);
  });

  it("returns true for 172.16.0.0 - 172.31.255.255 range", () => {
    expect(isPrivateIp("172.16.0.1")).toBe(true);
    expect(isPrivateIp("172.20.0.1")).toBe(true);
    expect(isPrivateIp("172.31.255.255")).toBe(true);
  });

  it("returns false for 172.32.0.0+ range (not private)", () => {
    expect(isPrivateIp("172.32.0.1")).toBe(false);
    expect(isPrivateIp("172.40.0.1")).toBe(false);
  });

  it("returns true for 192.168.x.x range", () => {
    expect(isPrivateIp("192.168.0.1")).toBe(true);
    expect(isPrivateIp("192.168.255.255")).toBe(true);
    expect(isPrivateIp("192.168.1.100")).toBe(true);
  });

  it("returns true for 127.x.x.x (loopback)", () => {
    expect(isPrivateIp("127.0.0.1")).toBe(true);
    expect(isPrivateIp("127.0.0.0")).toBe(true);
    expect(isPrivateIp("127.255.255.255")).toBe(true);
  });

  it("returns true for ::1 (IPv6 loopback)", () => {
    expect(isPrivateIp("::1")).toBe(true);
  });

  it("returns true for 169.254.x.x (link-local)", () => {
    expect(isPrivateIp("169.254.0.1")).toBe(true);
    expect(isPrivateIp("169.254.255.255")).toBe(true);
  });

  it("returns false for 8.8.8.8 (Google DNS)", () => {
    expect(isPrivateIp("8.8.8.8")).toBe(false);
  });

  it("returns false for 1.1.1.1 (Cloudflare DNS)", () => {
    expect(isPrivateIp("1.1.1.1")).toBe(false);
  });

  it("returns false for 0.0.0.0", () => {
    expect(isPrivateIp("0.0.0.0")).toBe(true); // RFC1122 reserved
  });

  it("returns false for public IPv6 addresses", () => {
    expect(isPrivateIp("2001:4860:4860::8888")).toBe(false);
    expect(isPrivateIp("2606:4700:4700::1111")).toBe(false);
  });
});

describe("validateUrl", () => {
  it("accepts valid HTTPS URLs to public IPs", async () => {
    const url = await validateUrl("https://8.8.8.8/");
    expect(url.ok).toBe(true);
    if (url.ok) expect(url.hostname).toBe("8.8.8.8");
  });

  it("accepts valid public hostnames", async () => {
    const url = await validateUrl("https://api.example.com/v1/");
    expect(url.ok).toBe(true);
    if (url.ok) expect(url.hostname).toBe("api.example.com");
  });

  it("rejects ftp:// URLs", async () => {
    const result = await validateUrl("ftp://files.example.com/file.txt");
    expect(result.ok).toBe(false);
  });

  it("rejects file:// URLs", async () => {
    const result = await validateUrl("file:///etc/passwd");
    expect(result.ok).toBe(false);
  });

  it("rejects URLs to localhost", async () => {
    const result = await validateUrl("http://localhost:8080/api");
    expect(result.ok).toBe(false);
  });

  it("rejects URLs to 127.0.0.1", async () => {
    const result = await validateUrl("http://127.0.0.1:3000/");
    expect(result.ok).toBe(false);
  });

  it("rejects URLs to 10.x.x.x private IPs", async () => {
    const result = await validateUrl("http://10.0.0.1/secret");
    expect(result.ok).toBe(false);
  });

  it("rejects URLs to 192.168.x.x private IPs", async () => {
    const result = await validateUrl("http://192.168.1.1/admin");
    expect(result.ok).toBe(false);
  });

  it("rejects URLs to 169.254.x.x link-local IPs", async () => {
    const result = await validateUrl("http://169.254.169.254/latest/meta-data/");
    expect(result.ok).toBe(false);
  });

  it("rejects URLs to ::1 (IPv6 loopback)", async () => {
    await expect(validateUrl("http://[::1]:8080/")).resolves.toMatchObject({ ok: false });
  });

  it("rejects truly invalid URLs", async () => {
    const result = await validateUrl("not-a-url");
    expect(result.ok).toBe(false);
    expect((result as any).error).toMatch(/Invalid URL/i);
  });
});