import { DEFAULT_ADMIN_EMAILS } from "@layerflow/contracts";

/**
 * Client-safe admin allowlist for UI gating (sidebar / settings link).
 * Real enforcement is server-side on `/api/admin/*`.
 *
 * Override with `NEXT_PUBLIC_ADMIN_EMAILS` (comma-separated).
 */
export function getAdminEmails(): string[] {
  const raw =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_ADMIN_EMAILS?.trim()
      : undefined;
  if (!raw) return [...DEFAULT_ADMIN_EMAILS];
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
