import Link from "next/link";
import {
  TerminalSquare,
  Brain,
  MessageSquareWarning,
  History,
  FolderKanban,
  Bot,
  CheckCircle2,
} from "@/components/ui/icons";
import { PageHeader } from "@/components/shared/page-header";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { syncService } from "@/lib/services/sync";
import { timeAgo } from "@/lib/data/providers";

const ENTITY_ICON: Record<string, { icon: typeof History; label: string }> = {
  session: { icon: TerminalSquare, label: "Session" },
  message: { icon: MessageSquareWarning, label: "Message" },
  memory: { icon: Brain, label: "Memory" },
  project: { icon: FolderKanban, label: "Project" },
};

function entityInfo(entity: string) {
  return ENTITY_ICON[entity] ?? { icon: History, label: entity };
}

function payloadTitle(payload: Record<string, unknown>): string {
  for (const key of ["title", "summary", "name", "content", "body", "command"]) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return "Synced operation";
}

export default async function TerminalPage() {
  const [opsRes, devicesRes] = await Promise.all([
    syncService.operationsServer({ limit: 100 }),
    syncService.devicesServer(),
  ]);

  const operations = opsRes.operations ?? [];
  const devices = devicesRes.devices ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Terminal"
        description="Sessions synced from `lf` — your CLI work, in real time."
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelHeader
            title="Synced operations"
            description="Sessions, messages, memories and project notes from your devices"
          />
          <PanelBody className="p-0">
            {operations.length > 0 ? (
              <ul className="divide-y divide-border">
                {operations.map((op) => {
                  const info = entityInfo(op.entity);
                  const Icon = info.icon;
                  return (
                    <li key={op.op_id} className="flex items-center gap-4 px-5 py-3.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-brand">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-mono text-[13px] font-medium text-ink">
                            {payloadTitle(op.payload as Record<string, unknown>)}
                          </p>
                          <Badge tone="neutral">{info.label}</Badge>
                        </div>
                        <p className="mt-0.5 font-mono text-[11px] text-faint">
                          {op.device_id} · {timeAgo(op.created_at)}
                        </p>
                      </div>
                      <span className="hidden items-center gap-1 rounded-full border border-mint/30 bg-mint/10 px-2 py-0.5 text-[10px] font-medium text-mint md:inline-flex">
                        <CheckCircle2 className="h-3 w-3" /> Synced
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="px-5 py-10">
                <EmptyState
                  icon={<TerminalSquare className="h-5 w-5" />}
                  title="No synced sessions yet"
                  description="Install the CLI and run a session — it syncs automatically."
                />
                <div className="mt-5 rounded-xl border border-border bg-surface-2/50 p-4">
                  <p className="font-mono text-xs text-ink">
                    <span className="text-faint">$</span> curl -fsSL https://raw.githubusercontent.com/Rohit94r/layerflow-releases/main/install.sh | bash
                  </p>
                  <p className="mt-2 font-mono text-[11px] text-faint">$ lf sync</p>
                </div>
              </div>
            )}
          </PanelBody>
        </Panel>

        <div className="space-y-5">
          <Panel>
            <PanelHeader title="Connected devices" description="CLI installs in your workspace" />
            <PanelBody className="p-0">
              {devices.length > 0 ? (
                <ul className="divide-y divide-border">
                  {devices.map((device) => (
                    <li key={device.id} className="flex items-center gap-3 px-5 py-3">
                      <span className="relative flex h-2 w-2 shrink-0">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mint opacity-60" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-mint" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-mono text-[12px] font-medium text-ink">
                          {device.name || device.device_id}
                        </p>
                        <p className="mt-0.5 text-[10px] text-faint">
                          Seen {timeAgo(device.last_seen_at)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-5 py-8 text-center">
                  <Bot className="mx-auto h-5 w-5 text-faint" />
                  <p className="mt-2 text-xs text-faint">No devices connected yet.</p>
                </div>
              )}
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader title="Run a session" description="Everything syncs back here" />
            <PanelBody className="space-y-2.5 text-[13px] leading-relaxed text-ink/80">
              <p>
                <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs text-brand">lf ask</span> — chat
                with any model from your terminal.
              </p>
              <p>
                <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs text-brand">lf run</span> — run a
                prompt and track cost.
              </p>
              <p>
                <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs text-brand">lf memory</span> —
                review what LayerFlow remembered.
              </p>
              <Link
                href="/keys"
                className="mt-1 inline-flex text-xs font-medium text-brand hover:underline"
              >
                Create an API key for your CLI →
              </Link>
            </PanelBody>
          </Panel>
        </div>
      </div>
    </div>
  );
}
