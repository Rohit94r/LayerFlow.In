import Link from "next/link";
import {
  ArrowRight,
  Bot,
  BookUser,
  CheckCircle2,
  Clock,
  MessageSquareWarning,
  Sparkles,
  TerminalSquare,
} from "@/components/ui/icons";
import { Badge } from "@/components/ui/badge";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { NAV_GROUPS } from "@/lib/config/navigation";
import { workspaceService } from "@/lib/services/workspace";
import { rescueService } from "@/lib/services/rescue";
import { promptService } from "@/lib/services/prompts";
import { agentsService } from "@/lib/services/agents";
import { chatService } from "@/lib/services/chat";
import { memoryService } from "@/lib/services/memory";
import { notificationsService } from "@/lib/services/notifications";
import { apiFetch, getServerCookieHeader } from "@/lib/api/client";
import { listRunsResponseSchema, type Run } from "@layerflow/contracts";
import { timeAgo } from "@/lib/data/providers";
import { QuickSearch } from "@/components/features/home/quick-search";
import { TerminalActivity } from "@/components/features/home/terminal-activity";

async function listRecentRuns(limit = 5): Promise<Run[] | null> {
  try {
    const headers = await getServerCookieHeader();
    const res = await apiFetch(
      "/api/runs",
      { query: { limit }, ...(headers.Cookie ? { headers } : {}) },
      listRunsResponseSchema,
    );
    return res.runs;
  } catch {
    return null;
  }
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

const today = new Date().toLocaleDateString("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
});

export default async function HomePage() {
  const [timeline, costs, reports, prompts, agents, sessions, memories, notifications, runs] = await Promise.all([
    workspaceService.listTimeline().catch(() => null),
    workspaceService.getCostAnalytics().catch(() => null),
    rescueService.listRescueReports().catch(() => null),
    promptService.listPrompts().catch(() => null),
    agentsService.list().catch(() => null),
    chatService.list({ limit: 8 }).catch(() => null),
    memoryService.list({ limit: 3 }).catch(() => null),
    notificationsService.listServer({ limit: 10 }).catch(() => null),
    listRecentRuns(5),
  ]);

  const chatSessions = sessions?.sessions ?? [];
  const latest = chatSessions[0] ?? null;
  const runningAgents = (agents?.agents ?? []).filter((a) => a.status === "active");
  const unread = (notifications?.notifications ?? []).filter((n) => !n.read);
  const recentEvents = [...(timeline ?? [])]
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 5);

  const stats = [
    {
      label: "Monthly spend",
      value: costs ? `$${costs.monthlySpend.toFixed(2)}` : "—",
      icon: Clock,
    },
    { label: "Continue Packs", value: String((reports ?? []).length), icon: MessageSquareWarning },
    { label: "Conversations", value: String(chatSessions.length || "—"), icon: BookUser },
    { label: "Active agents", value: String(runningAgents.length), icon: Bot },
  ];

  return (
    <div className="space-y-8">
      {/* ── Header ───────────────────────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-faint">{today}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">{greeting()}, there</h1>
          <p className="mt-1.5 text-sm text-muted">Pick up where you left off — chat, agents and terminal sessions are one click away.</p>
        </div>
        <QuickSearch />
      </div>

      {/* ── Priority row ─────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {/* Continue Chatting */}
        <Link
          href="/chat"
          className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-surface/40 p-5 transition-all duration-150 hover:border-brand hover:bg-surface-2/40"
        >
          <div className="flex items-start justify-between">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2 text-brand">
              <BookUser className="h-5 w-5" />
            </span>
            <ArrowRight className="h-4 w-4 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
          </div>
          <div className="mt-6">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-brand">Continue Chatting</p>
            <p className="mt-1 truncate text-sm font-semibold text-ink">{latest?.title ?? "Start a new conversation"}</p>
            <p className="mt-0.5 text-[11px] text-faint">
              {latest ? `${timeAgo(latest.lastMessageAt ?? latest.createdAt)} · ${latest.messageCount} messages` : "Most recent session"}
            </p>
          </div>
        </Link>

        {/* Continue Terminal Session */}
        <Link
          href="/terminal"
          className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-surface/40 p-5 transition-all duration-150 hover:border-brand hover:bg-surface-2/40"
        >
          <div className="flex items-start justify-between">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2 text-brand">
              <TerminalSquare className="h-5 w-5" />
            </span>
            <ArrowRight className="h-4 w-4 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
          </div>
          <div className="mt-6">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-brand">Continue Terminal Session</p>
            <p className="mt-1 truncate text-sm font-semibold text-ink">
              {runs?.length ? `${timeAgo(runs[0].createdAt)} · ${runs[0].status}` : "A fresh session awaits"}
            </p>
            <p className="mt-0.5 text-[11px] text-faint">
              {runs?.length ? `${runs.length} active runs · ${runs[0].model}` : "Syncs your CLI sessions"}
            </p>
          </div>
        </Link>

        {/* Recent Conversations */}
        <Panel className="xl:col-span-1">
          <PanelHeader
            title="Recent Conversations"
            action={
              <Link href="/chat" className="text-xs font-medium text-brand hover:underline">
                Open
              </Link>
            }
          />
          <PanelBody className="space-y-1 p-2">
            {chatSessions.slice(0, 3).map((s) => (
              <Link
                key={s.id}
                href={`/chat/${s.id}`}
                className="block rounded-xl px-3 py-2 transition-colors hover:bg-surface-2/60"
              >
                <p className="truncate text-[13px] font-medium text-ink">{s.title}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-faint">
                  <span className="font-mono">{s.defaultModel?.split("/").pop() ?? "auto"}</span>
                  <span>·</span>
                  <span>{timeAgo(s.lastMessageAt ?? s.createdAt)}</span>
                  {s.source === "rescue" ? <Badge tone="violet">Rescued</Badge> : null}
                </p>
              </Link>
            ))}
            {!chatSessions.length ? (
              <p className="px-3 py-4 text-center text-xs text-faint">No conversations yet — start one above.</p>
            ) : null}
          </PanelBody>
        </Panel>

        {/* Active Agents */}
        <Panel className="xl:col-span-1">
          <PanelHeader
            title="Active Agents"
            action={
              <Link href="/agents" className="text-xs font-medium text-brand hover:underline">
                Open
              </Link>
            }
          />
          <PanelBody className="space-y-1 p-2">
            {(agents?.agents ?? []).slice(0, 3).map((a) => (
              <Link key={a.id} href="/agents" className="block rounded-xl px-3 py-2 transition-colors hover:bg-surface-2/60">
                <p className="flex items-center gap-2 truncate text-[13px] font-medium text-ink">
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${a.status === "active" ? "bg-mint" : "bg-faint"}`} />
                  {a.name}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-faint">
                  {a.role} · {a.runCount} runs · {timeAgo(a.lastRunAt ?? a.createdAt)}
                </p>
              </Link>
            ))}
            {!agents?.agents.length ? (
              <p className="px-3 py-4 text-center text-xs text-faint">No agents yet — create one from the Agents page.</p>
            ) : null}
          </PanelBody>
        </Panel>
      </div>

      {/* ── Terminal Activity ────────────────────────────── */}
      <TerminalActivity runs={runs} />

      {/* ── Secondary row ────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Memory Highlights */}
        <Panel>
          <PanelHeader
            title="Memory Highlights"
            action={
              <Link href="/search" className="text-xs font-medium text-brand hover:underline">
                Search
              </Link>
            }
          />
          <PanelBody className="space-y-0.5 p-0">
            {(memories?.memories ?? []).map((m) => (
              <Link
                key={m.id}
                href="/search"
                className="block px-5 py-3 transition-colors hover:bg-surface-2/50"
              >
                <p className="truncate text-[13px] font-semibold text-ink">{m.title}</p>
                <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-faint">{m.body}</p>
              </Link>
            ))}
            {!memories?.memories.length ? (
              <p className="px-5 py-6 text-center text-xs text-faint">Nothing saved yet — save chat moments and they appear here.</p>
            ) : null}
          </PanelBody>
        </Panel>

        {/* Notifications */}
        <Panel>
          <PanelHeader
            title="Notifications"
            action={
              unread.length ? (
                <Badge tone="amber">{unread.length} new</Badge>
              ) : undefined
            }
          />
          <PanelBody className="space-y-0.5 p-0">
            {(notifications?.notifications ?? []).slice(0, 3).map((n) => (
              <div key={n.id} className="flex items-start gap-3 px-5 py-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-ink">{n.title}</p>
                  {n.body ? <p className="mt-0.5 line-clamp-1 text-[11px] text-faint">{n.body}</p> : null}
                  <p className="mt-0.5 text-[10px] text-faint">{timeAgo(n.createdAt)}</p>
                </div>
              </div>
            ))}
            {!notifications?.notifications.length ? (
              <p className="px-5 py-6 text-center text-xs text-faint">You&apos;re all caught up.</p>
            ) : null}
          </PanelBody>
        </Panel>

        {/* Team Activity */}
        <Panel>
          <PanelHeader
            title="Team Activity"
            action={
              <Link href="/history" className="text-xs font-medium text-brand hover:underline">
                View all
              </Link>
            }
          />
          <PanelBody className="space-y-0.5 p-0">
            {recentEvents.length ? (
              recentEvents.map((evt) => (
                <div key={evt.id} className="flex items-start gap-3 px-5 py-3">
                  <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-surface-2 text-brand">
                    <CheckCircle2 className="h-3 w-3" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-ink">{evt.title}</p>
                    <p className="mt-0.5 line-clamp-1 text-[11px] text-faint">{evt.description}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="px-5 py-6 text-center text-xs text-faint">The workspace is quiet — start a chat or sync a terminal session to see activity here.</p>
            )}
          </PanelBody>
        </Panel>
      </div>

      {/* ── Recent prompts + everything else ─────────────── */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-1">
          <PanelHeader
            title="Recent Prompts"
            action={
              <Link href="/prompts" className="text-xs font-medium text-brand hover:underline">
                Library
              </Link>
            }
          />
          <PanelBody className="space-y-0.5 p-0">
            {(prompts ?? []).slice(0, 4).map((p) => (
              <Link
                key={p.id}
                href={`/prompts/${p.id}`}
                className="block px-5 py-3 transition-colors hover:bg-surface-2/50"
              >
                <p className="truncate text-[13px] font-medium text-ink">{p.title}</p>
                <p className="mt-0.5 flex items-center justify-between text-[11px] text-faint">
                  <span>Score {p.score}</span>
                  <span>{timeAgo(p.updatedAt)}</span>
                </p>
              </Link>
            ))}
            {!prompts?.length ? (
              <p className="px-5 py-6 text-center text-xs text-faint">Share prompts with your team and they show up here.</p>
            ) : null}
          </PanelBody>
        </Panel>

        <div className="lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold tracking-tight text-ink">Everything in LayerFlow</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {NAV_GROUPS.flatMap((g) => g.items).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-center gap-3 rounded-xl border border-border bg-surface/40 p-3 transition-colors duration-150 hover:border-border-strong hover:bg-surface-2/50"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2">
                  <item.icon className="h-4 w-4 text-brand" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-ink transition-colors group-hover:text-brand">
                    {item.label}
                  </p>
                  <p className="truncate text-[11px] text-faint">{item.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── Cost summary strip ───────────────────────────── */}
      {costs ? (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border border-border bg-surface/40 px-5 py-4">
          <p className="inline-flex items-center gap-2 text-sm font-medium text-ink">
            <Sparkles className="h-4 w-4 text-brand-2" />
            This month: <span className="font-mono font-semibold text-brand">${costs.monthlySpend.toFixed(2)}</span>
          </p>
          <p className="text-xs text-faint">
            {stats[0].label.toLowerCase()} — saving {costs.monthlySavings > 0 ? `$${costs.monthlySavings.toFixed(2)}` : "—"} this cycle
          </p>
        </div>
      ) : null}
    </div>
  );
}