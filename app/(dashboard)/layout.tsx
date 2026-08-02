import AppShell from "./AppShell";

/** Auth-gated workspace — skip static prerender (Better Auth hooks need a request). */
export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
