import { URL } from "node:url";
import { logger } from "../../config/logger";

/**
 * SSRF (Server-Side Request Forgery) protection utilities.
 *
 * Whenever the agent tool system fetches a URL provided by user/AI input,
 * call `validateUrl()` first to block requests to private/internal IP ranges.
 * This prevents the agent from being used as a proxy to scan internal
 * infrastructure.
 */

// ── Private IP range matchers ──────────────────────────────────

const PRIVATE_RANGES: Array<{ label: string; test: (ip: string) => boolean }> = [];

function isIpInRange(ip: string, base: string, mask: number): boolean {
  try {
    const parts = ip.split(".").map(Number);
    if (parts.length !== 4 || parts.some(isNaN)) return false;
    const baseParts = base.split(".").map(Number);
    const ipInt =
      (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
    const baseInt =
      (baseParts[0] << 24) + (baseParts[1] << 16) + (baseParts[2] << 8) + baseParts[3];
    const maskBits = ~((1 << (32 - mask)) - 1);
    return (ipInt & maskBits) === (baseInt & maskBits);
  } catch {
    return false;
  }
}

// 10.0.0.0/8
PRIVATE_RANGES.push({
  label: "10.x.x.x",
  test: (ip) => isIpInRange(ip, "10.0.0.0", 8),
});

// 172.16.0.0/12
PRIVATE_RANGES.push({
  label: "172.16-31.x.x",
  test: (ip) => isIpInRange(ip, "172.16.0.0", 12),
});

// 192.168.0.0/16
PRIVATE_RANGES.push({
  label: "192.168.x.x",
  test: (ip) => isIpInRange(ip, "192.168.0.0", 16),
});

// 127.0.0.0/8 (loopback)
PRIVATE_RANGES.push({
  label: "127.x.x.x",
  test: (ip) => isIpInRange(ip, "127.0.0.0", 8),
});

// 169.254.0.0/16 (link-local)
PRIVATE_RANGES.push({
  label: "169.254.x.x",
  test: (ip) => isIpInRange(ip, "169.254.0.0", 16),
});

/**
 * Check whether an IP address string is a known private / reserved address
 * that should never be reached by an agent tool. Supports IPv4 private ranges
 * and the IPv6 loopback address.
 */
export function isPrivateIp(ip: string): boolean {
  if (ip === "::1" || ip === "0:0:0:0:0:0:0:1") return true;
  if (ip === "0.0.0.0") return true;
  return PRIVATE_RANGES.some((r) => r.test(ip));
}

/**
 * Extract the hostname from a URL, resolve it to an IP (DNS), and reject if
 * the IP is private / reserved. Also rejects obviously malformed URLs and
 * non-HTTP(S) protocols.
 *
 * Returns `{ ok: true, ip }` on success, or `{ ok: false, error }` on failure.
 */
export async function validateUrl(urlString: string): Promise<
  | { ok: true; ip: string; hostname: string; url: URL }
  | { ok: false; error: string }
> {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    return { ok: false, error: `Invalid URL: "${urlString}"` };
  }

  // Only allow HTTP / HTTPS
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return {
      ok: false,
      error: `Protocol "${url.protocol}" is not allowed — only http:// and https://`,
    };
  }

  const hostnameRaw = url.hostname;
  // Strip IPv6 brackets (Node.js URL returns "[::1]" for literal IPv6 addresses)
  const hostname = hostnameRaw.replace(/^\[|\]$/g, "");
  const isIpLiteral = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) || hostname === "::1";

  let resolvedIp: string;

  if (isIpLiteral) {
    resolvedIp = hostname;
    if (isPrivateIp(resolvedIp)) {
      return {
        ok: false,
        error: `Blocked request to private IP range: ${resolvedIp}`,
      };
    }
    return { ok: true, ip: resolvedIp, hostname, url };
  }

  // Resolve DNS (A-record lookup)
  try {
    const dns = await import("node:dns/promises");
    const addresses = await dns.resolve4(hostname);
    if (addresses.length === 0) {
      return { ok: false, error: `DNS resolution returned no records for: ${hostname}` };
    }
    resolvedIp = addresses[0];
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `DNS resolution failed for ${hostname}: ${message}` };
  }

  if (isPrivateIp(resolvedIp)) {
    return {
      ok: false,
      error: `Blocked request to private IP range: ${resolvedIp} (resolved from ${hostname})`,
    };
  }

  return { ok: true, ip: resolvedIp, hostname, url };
}

/**
 * Fetch a URL safely — validates SSRF, sets a timeout, and limits response
 * size. Returns a structured result on success/failure.
 */
export async function safeFetch(
  urlString: string,
  options: { timeoutMs?: number; maxBytes?: number } = {},
): Promise<{ ok: true; body: string; contentType: string } | { ok: false; error: string }> {
  const validated = await validateUrl(urlString);
  if (!validated.ok) return validated;

  const { timeoutMs = 15_000, maxBytes = 2 * 1024 * 1024 } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(validated.url, {
      signal: controller.signal,
      headers: { "User-Agent": "LayerFlow-Agent/1.0" },
    });

    if (!response.ok) {
      return {
        ok: false,
        error: `HTTP ${response.status} ${response.statusText}`,
      };
    }

    const contentType = response.headers.get("content-type") ?? "application/octet-stream";
    const contentLength = response.headers.get("content-length");
    if (contentLength && Number(contentLength) > maxBytes) {
      return {
        ok: false,
        error: `Response too large: ${contentLength} bytes (max ${maxBytes})`,
      };
    }

    const reader = response.body?.getReader();
    if (!reader) {
      return { ok: false, error: "Response body is not readable" };
    }

    const decoder = new TextDecoder();
    let body = "";
    let total = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > maxBytes) {
        reader.cancel();
        return {
          ok: false,
          error: `Response exceeded ${maxBytes} bytes after reading ${total} bytes`,
        };
      }
      body += decoder.decode(value, { stream: true });
    }
    body += decoder.decode(); // flush

    logger.info(
      { url: validated.hostname, bytes: total, contentType },
      "safeFetch completed",
    );

    return { ok: true, body, contentType };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (err instanceof DOMException && err.name === "AbortError") {
      return { ok: false, error: `Request timed out after ${timeoutMs}ms` };
    }
    return { ok: false, error: message };
  } finally {
    clearTimeout(timer);
  }
}