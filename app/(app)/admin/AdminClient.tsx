"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Users, UserPlus, Activity, CalendarDays } from "lucide-react";
import PageHeader from "@/components/workspace/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/workspace/DataState";
import { useAuth } from "@/lib/auth-provider";
import { isAdminEmail } from "@/lib/admin";
import { useAsyncData, errorMessage } from "@/lib/hooks/use-async-data";
import { getAdminAnalytics } from "@/lib/api";
import { ApiClientError } from "@/lib/api/client";
import type { AdminAnalyticsResponse } from "@layerflow/contracts";

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatRelativeDay(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const startToday = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const startThat = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const diffDays = Math.round((startToday - startThat) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: number;
  hint: string;
  icon: typeof Users;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-faint">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-ink tabular-nums">
            {value.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-muted">{hint}</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-2 text-brand">
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

function AdminDashboard() {
  const state = useAsyncData(() => getAdminAnalytics(), []);

  if (state.status === "loading") {
    return <LoadingState label="Loading analytics…" />;
  }

  if (state.status === "error") {
    const status =
      state.error instanceof ApiClientError ? state.error.status : undefined;
    if (status === 403) {
      return (
        <div className="card flex flex-col items-center justify-center px-6 py-16 text-center">
          <p className="text-sm font-medium text-ink">Not authorized</p>
          <p className="mt-2 max-w-md text-sm text-muted">
            Your account cannot view admin analytics.
          </p>
        </div>
      );
    }
    return <ErrorState message={errorMessage(state.error)} onRetry={state.reload} />;
  }

  const data: AdminAnalyticsResponse = state.data;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        title="Analytics"
        description="Sign-ups, sessions, and who has logged into LayerFlow."
        actions={
          <button
            type="button"
            onClick={state.reload}
            className="btn-secondary rounded-lg px-3 py-1.5 text-sm"
          >
            Refresh
          </button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Total users"
          value={data.totals.users}
          hint="All registered accounts"
          icon={Users}
        />
        <MetricCard
          label="New today"
          value={data.totals.usersToday}
          hint="First seen since UTC midnight"
          icon={UserPlus}
        />
        <MetricCard
          label="New this week"
          value={data.totals.usersThisWeek}
          hint="Since Monday UTC"
          icon={CalendarDays}
        />
        <MetricCard
          label="Active sessions"
          value={data.totals.activeSessions}
          hint="Auth sessions not yet expired"
          icon={Activity}
        />
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold text-ink">Users</h2>
          <p className="text-sm text-muted">
            Emails that registered or signed in ({data.users.length} shown)
          </p>
        </div>
        {data.users.length === 0 ? (
          <EmptyState title="No users yet" description="Sign-ups will appear here." />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-2/60 text-xs uppercase tracking-wider text-faint">
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Signed up</th>
                    <th className="px-4 py-3 font-medium">Last login</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.users.map((row) => (
                    <tr key={row.id} className="hover:bg-surface-2/40">
                      <td className="px-4 py-3 font-medium text-ink">{row.email}</td>
                      <td className="px-4 py-3 text-muted">{row.name || "—"}</td>
                      <td className="px-4 py-3 text-muted">
                        <span title={formatDateTime(row.createdAt)}>
                          {formatRelativeDay(row.createdAt)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {row.lastLoginAt ? (
                          <span title={formatDateTime(row.lastLoginAt)}>
                            {formatRelativeDay(row.lastLoginAt)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold text-ink">Recent logins</h2>
          <p className="text-sm text-muted">Latest auth sessions (no tokens exposed)</p>
        </div>
        {data.recentLogins.length === 0 ? (
          <EmptyState title="No sessions yet" description="Logins will show up here." />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-2/60 text-xs uppercase tracking-wider text-faint">
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Started</th>
                    <th className="px-4 py-3 font-medium">Expires</th>
                    <th className="px-4 py-3 font-medium">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.recentLogins.map((row) => (
                    <tr key={row.id} className="hover:bg-surface-2/40">
                      <td className="px-4 py-3">
                        <p className="font-medium text-ink">{row.email}</p>
                        <p className="text-xs text-faint">{row.name}</p>
                      </td>
                      <td className="px-4 py-3 text-muted">{formatDateTime(row.createdAt)}</td>
                      <td className="px-4 py-3 text-muted">{formatDateTime(row.expiresAt)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted">
                        {row.ipAddress ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <p className="text-xs text-faint">
        Generated {formatDateTime(data.generatedAt)} · UTC day/week boundaries
      </p>
    </div>
  );
}

export default function AdminClient() {
  const { user, isPending } = useAuth();
  const router = useRouter();
  const allowed = isAdminEmail(user?.email);

  useEffect(() => {
    if (isPending) return;
    if (!user) return;
    if (!allowed) {
      router.replace("/workspace");
    }
  }, [allowed, isPending, router, user]);

  if (isPending || !user) {
    return <LoadingState label="Checking access…" />;
  }

  if (!allowed) {
    return (
      <div className="card flex flex-col items-center justify-center px-6 py-16 text-center">
        <p className="text-sm font-medium text-ink">Not authorized</p>
        <p className="mt-2 max-w-md text-sm text-muted">
          This page is restricted to LayerFlow admins.
        </p>
      </div>
    );
  }

  return <AdminDashboard />;
}
