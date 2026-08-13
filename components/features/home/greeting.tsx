"use client";

import { useSession } from "@/lib/auth-client";

/** Time-based greeting — morning/afternoon/evening. */
function greetingForHour(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/**
 * Header greeting with the signed-in user's first name.
 * Falls back to "there" until the session loads (same pattern as the sidebar).
 */
export function Greeting() {
  const session = useSession();
  const name = session.data?.user?.name?.trim();
  const first = name ? name.split(/\s+/)[0] : "";

  return (
    <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
      {greetingForHour(new Date().getHours())}, {first || "there"}
    </h1>
  );
}