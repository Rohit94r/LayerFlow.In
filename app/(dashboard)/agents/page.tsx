import { FileCode2, GitBranch, Play, Cpu, Plus, Terminal } from "@/components/ui/icons";
import { PageHeader } from "@/components/shared/page-header";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/input";
import { AGENTS } from "@/lib/data/code";
import type { Agent } from "@/lib/data/code";
import { cn } from "@/lib/utils";

const STATUS_META: Record<Agent["status"], { label: string; className: string }> = {
  idle: { label: "Idle", className: "bg-surface-2 text-faint" },
  running: { label: "Running", className: "bg-brand/15 text-brand" },
  done: { label: "Done", className: "bg-brand-2/15 text-brand-2" },
  reviewing: { label: "Reviewing", className: "bg-amber-500/15 text-amber-400" },
};

const ROLE_META: Record<Agent["role"], { label: string; icon: typeof Play }> = {
  implement: { label: "Implement", icon: FileCode2 },
  review: { label: "Review", icon: GitBranch },
  test: { label: "Test", icon: Play },
};

export default function AgentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Agents"
        description="Specialist agents that share one session — each with its own model, budget and output."
        action={
          <Button size="sm" icon={<Plus className="h-4 w-4" />}>
            New agent
          </Button>
        }
      />

      <Panel className="gradient-border">
        <PanelHeader
          title="Agent mesh"
          description="Parallel workers on the current session"
          action={<Badge tone="neutral">{AGENTS.length} agents · 1 session</Badge>}
        />
        <PanelBody>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {AGENTS.map((agent) => {
              const status = STATUS_META[agent.status];
              const role = ROLE_META[agent.role];
              const Icon = role.icon;
              return (
                <div
                  key={agent.id}
                  className="flex items-start gap-3 rounded-xl border border-border bg-surface-2/40 p-4"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-ink">{agent.name}</p>
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", status.className)}>
                        {status.label}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-muted">{agent.detail}</p>
                    <p className="mt-2 inline-flex items-center gap-1.5 text-[10px] text-faint">
                      <Cpu className="h-3 w-3" /> {agent.model}
                    </p>
                  </div>
                </div>
              );
            })}

            <button
              type="button"
              className="flex min-h-[104px] flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border text-faint transition-colors hover:border-border-strong hover:text-muted"
            >
              <Plus className="h-4 w-4" />
              <span className="text-[11px] font-medium">Spawn an agent</span>
            </button>
          </div>
        </PanelBody>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <PanelHeader
            title="New agent"
            description="Pick a model, set a budget, drop it into the session"
            action={<Terminal className="h-4 w-4 text-faint" />}
          />
          <PanelBody className="space-y-3">
            <Field label="Model">
              <Select defaultValue="claude-sonnet">
                <option value="claude-sonnet">Claude Sonnet 4.5</option>
                <option value="gpt-5">GPT-5</option>
                <option value="gemini-flash">Gemini 2.5 Flash</option>
                <option value="deepseek-v3">DeepSeek V3.2</option>
              </Select>
            </Field>
            <div className="flex items-center justify-between rounded-xl border border-border bg-surface-2/40 px-4 py-3">
              <div>
                <p className="text-xs font-semibold text-ink">Budget cap</p>
                <p className="text-[11px] text-faint">Hard stop on tokens per run</p>
              </div>
              <span className="font-mono text-sm font-semibold text-ink">$2.00</span>
            </div>
            <Button className="w-full" icon={<Plus className="h-4 w-4" />}>
              Add to session
            </Button>
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader title="How agents split work" description="One session, specialized passes" />
          <PanelBody className="space-y-3 text-sm text-muted">
            <p>
              <span className="font-semibold text-ink">Implement</span> — writes the code, owns the file diff.
            </p>
            <p>
              <span className="font-semibold text-ink">Review</span> — checks DX, a11y, edge cases; suggests fixes the
              implementer applies.
            </p>
            <p>
              <span className="font-semibold text-ink">Test</span> — runs the build, catches regressions, reports done
              only when green.
            </p>
            <p className="rounded-xl border border-border bg-surface-2/40 p-3.5 text-xs leading-relaxed text-faint">
              Every agent reads the same Context Passport, so nothing is re-explained between passes. This page is a
              live demo of the agent mesh — no real code is executed in this build.
            </p>
          </PanelBody>
        </Panel>
      </div>
    </div>
  );
}
