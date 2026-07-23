import dns from "node:dns";

/**
 * Neon publishes AAAA records; some local/VPN networks fail IPv6 routing or
 * transiently fail dual-stack lookups (getaddrinfo ENOTFOUND), which surfaces
 * as Better Auth 500s on sign-up / Google OAuth state inserts.
 * Prefer IPv4 for all subsequent DNS lookups in this process.
 */
dns.setDefaultResultOrder("ipv4first");
