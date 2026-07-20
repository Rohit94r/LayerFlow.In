import { DEFAULT_ADMIN_EMAILS } from "@layerflow/contracts";
import { getEnv } from "./env";

/**
 * Admin email allowlist. Override with comma-separated `ADMIN_EMAILS`
 * (e.g. `rjdhav67@gmail.com,other@example.com`). Defaults to the
 * product owner address so access works without extra env setup.
 */
export function getAdminEmails(): string[] {
  const raw = getEnv().ADMIN_EMAILS?.trim();
  if (!raw) {
    return [...DEFAULT_ADMIN_EMAILS];
  }
  const parsed = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return parsed.length > 0 ? parsed : [...DEFAULT_ADMIN_EMAILS];
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAdminEmails().includes(email.trim().toLowerCase());
}
