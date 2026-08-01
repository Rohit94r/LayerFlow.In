"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Sparkles,
  TerminalSquare,
  Bot,
  FileCode2,
  Folder,
  GitBranch,
  Cpu,
  ArrowRight,
  Check,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadialScore } from "@/components/ui/charts";
import {
  CODE_TREE,
  AGENTS,
  IMPROVED_PROMPT_EXAMPLE,
  TERMINAL_BOOT,
  type TerminalLine,
  type Agent,
} from "@/lib/data/code";
import { cn } from "@/lib/utils";

const TERMINAL_FLOW: { after: number; lines: TerminalLine[] }[] = [
  {
    after: 1,
    lines: [
      { id: 6, type: "out", text: "✓ read src/app/page.tsx (2.1 KB)" },
      { id: 7, type: "out", text: "✓ read src/components/hero.tsx (1.4 KB)" },
      { id: 8, type: "info", text: "implement: writing hero section…" },
    ],
  },
  {
    after: 2,
    lines: [
      { id: 9, type: "out", text: "✓ wrote src/components/hero.tsx (+38 lines)" },
      { id: 10, type: "info", text: "implement: writing feature grid…" },
    ],
  },
  {
    after: 3,
    lines: [
      { id: 11, type: "ok", text: "✓ implement done — 3 files changed, 0 errors" },
      { id: 12, type: "info", text: "review agent started · checking diff…" },
    ],
  },
  {
    after: 4,
    lines: [
      { id: 13, type: "out", text: "✓ review: 2 suggestions (hero spacing, alt text)" },
      { id: 14, type: "info", text: "test agent started · running build…" },
    ],
  },
  {
    after: 5,
    lines: [
      { id: 15, type: "ok", text: "✓ build passed in 4.2s · ready to ship" },
      { id: 16, type: "cmd", text: "lf git commit -m \"feat: landing page v1\"" },
      { id: 17, type: "ok", text: "✓ committed 3 files · session saved to workspace" },
    ],
  },
];

function Terminal() {
  const [lines, setLines] = useState<TerminalLine[]>(TERMINAL_BOOT);
  const [step, setStep] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (step >= TERMINAL_FLOW.length) return;
    const t = setTimeout(() => {
      setLines((prev) => [...prev, ...TERMINAL_FLOW[step].lines]);
      setStep((s) => s + 1);
    }, 1600);
    return () => clearTimeout(t);
  }, [step]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  return (
    <Card className="flex h-full min-h-[420px] flex-col overflow-hidden">
      <CardHeader
        title={
          <span className="inline-flex items-center gap-2">
            <TerminalSquare className="h-4 w-4 text-brand" />
            Terminal
          </span>
        }
        description="Live agent output — same as the `lf` CLI"
        action={<Badge tone="neutral">bash</Badge>}
      />
      <CardBody className="flex flex-1 flex-col px-4 pb-4">
        <div className="flex-1 rounded-xl border border-border bg-[#0a0e10] p-4 font-mono text-[12.5px] leading-relaxed">
          {lines.map((l) => (
            <div key={l.id} className="flex gap-2">
              {l.type === "cmd" ? (
                <span className="text-brand">$</span>
              ) : (
                <span className="w-2" />
              )}
              <span
                className={cn(
                  "whitespace-pre-wrap",
                  l.type === "cmd" && "text-white",
                  l.type === "info" && "text-muted",
                  l.type === "out" && "text-white/70",
                  l.type === "ok" && "text-emerald-400",
                  l.type === "err" && "text-rose-400",
                )}
              >
                {l.text}
              </span>
            </div>
          ))}
          <div className="mt-1 flex items-center gap-1.5 text-white/80">
            <span className="text-brand">$</span>
            <span className="h-4 w-2 animate-pulse bg-brand/80" />
          </div>
          <div ref={endRef} />
        </div>
      </CardBody>
    </Card>
  );
}

function AgentCard({ agent, index }: { agent: Agent; index: number }) {
  const statusMeta = {
    idle: { label: "Idle", className: "bg-surface-2 text-faint" },
    running: { label: "Running", className: "bg-brand/15 text-brand" },
    done: { label: "Done", className: "bg-emerald-500/15 text-emerald-400" },
    reviewing: { label: "Reviewing", className: "bg-amber-500/15 text-amber-400" },
  }[agent.status];

  const roleIcon =
    agent.role === "implement" ? <FileCode2 className="h-4 w-4" /> : agent.role === "review" ? <GitBranch className="h-4 w-4" /> : <Play className="h-4 w-4" />;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.08 }}
      className="flex items-start gap-3 rounded-xl border border-border bg-surface-2/40 p-3.5"
    >
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
        {roleIcon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[13px] font-semibold text-ink">{agent.name}</p>
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", statusMeta.className)}>
            {statusMeta.label}
          </span>
        </div>
        <p className="mt-0.5 truncate text-[11px] text-faint">{agent.detail}</p>
        <p className="mt-1 inline-flex items-center gap-1 text-[10px] text-faint">
          <Cpu className="h-3 w-3" /> {agent.model}
        </p>
      </div>
    </motion.div>
  );
}

function FileTreeNode({ node, depth = 0 }: { node: (typeof CODE_TREE)[number]; depth?: number }) {
  const [open, setOpen] = useState(true);
  const isFolder = node.type === "folder";
  return (
    <div>
      <button
        type="button"
        onClick={() => isFolder && setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-[12px] transition-colors hover:bg-surface-2",
          !isFolder && "text-muted hover:text-ink",
        )}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
      >
        {isFolder ? (
          <>
            <ChevronRight className={cn("h-3 w-3 text-faint transition-transform", open && "rotate-90")} />
            <Folder className="h-3.5 w-3.5 text-amber-400/80" />
            <span className="text-ink">{node.name}</span>
          </>
        ) : (
          <>
            <span className="w-3" />
            <FileCode2 className="h-3.5 w-3.5 text-sky-400/80" />
            <span className="truncate">{node.name}</span>
          </>
        )}
      </button>
      {isFolder && open && node.children?.map((child) => (
        <FileTreeNode key={child.name} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

export default function CodePage() {
  const [input, setInput] = useState("");
  const [improved, setImproved] = useState<typeof IMPROVED_PROMPT_EXAMPLE | null>(null);
  const [improving, setImproving] = useState(false);
  const [running, setRunning] = useState(false);
  const [agents, setAgents] = useState<Agent[]>(AGENTS);

  const improve = () => {
    if (!input.trim() || improving) return;
    setImproving(true);
    setTimeout(() => {
      setImproved(IMPROVED_PROMPT_EXAMPLE);
      setImproving(false);
    }, 1200);
  };

  const run = () => {
    if (running) return;
    setRunning(true);
    setAgents((prev) => prev.map((a) => (a.role === "implement" ? { ...a, status: "running", detail: "Editing src/app/page.tsx · hero section" } : a)));
    setTimeout(() => {
      setAgents((prev) =>
        prev.map((a) =>
          a.role === "implement"
            ? { ...a, status: "done", detail: "3 files changed · hero + features + pricing" }
            : a.role === "review"
              ? { ...a, status: "reviewing", detail: "Checking diff for DX and a11y" }
              : a,
        ),
      );
      setTimeout(() => {
        setAgents((prev) =>
          prev.map((a) =>
            a.role === "review"
              ? { ...a, status: "done", detail: "2 suggestions applied" }
              : a.role === "test"
                ? { ...a, status: "done", detail: "Build passed in 4.2s" }
                : a,
          ),
        );
      }, 3000);
    }, 2600);
  };

  return (
    <div>
      <PageHeader
        title="Coding workspace"
        description="Plain English in, working code out — with agents, a terminal, and context that never gets lost."
        actions={
          <>
            <Badge tone="amber">0 credits used this session</Badge>
          </>
        }
      />

      {/* ── Prompt improver ── */}
      <Card className="gradient-border">
        <CardHeader
          title={
            <span className="inline-flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-brand" />
              Write plain English — click Improve
            </span>
          }
          description="Your vague ask becomes a precise prompt with context, constraints and format — scored before it runs."
          action={<Badge tone="neutral">Prompt Improver</Badge>}
        />
        <CardBody>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && improve()}
              placeholder="build me a landing page…"
              className="min-w-0 flex-1 rounded-xl border border-border bg-surface-2/60 px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-faint focus:border-brand/50"
            />
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={improve}
                disabled={improving || !input.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {improving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Improve
              </button>
              <button
                type="button"
                onClick={run}
                disabled={running}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-medium text-black transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Play className="h-4 w-4" />
                {running ? "Running…" : "Run with agents"}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {improved && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-4 grid gap-4 rounded-xl border border-brand/20 bg-brand/5 p-4 lg:grid-cols-[1fr_180px]">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-brand">Improved prompt</p>
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                        <Check className="h-3 w-3" /> 3 issues fixed
                      </span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap font-mono text-[12.5px] leading-relaxed text-ink/90">
                      {improved.improved}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {improved.reasons.map((r) => (
                        <span key={r} className="rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[10px] text-muted">
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-surface-2/60 p-4">
                    <RadialScore value={improved.score} />
                    <p className="text-[11px] text-faint">prompt score</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardBody>
      </Card>

      {/* ── Workspace: files + agents ── */}
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader
            title="Files"
            description="Agent workspace — current project"
            action={<Bot className="h-4 w-4 text-brand" />}
          />
          <CardBody className="pb-4">
            <div className="max-h-[300px] overflow-y-auto rounded-xl border border-border bg-surface-2/30 p-2">
              {CODE_TREE.map((node) => (
                <FileTreeNode key={node.name} node={node} />
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between rounded-xl border border-dashed border-border px-3 py-2.5 text-[11px] text-faint">
              <span>Session context: 1.2K tokens</span>
              <span className="inline-flex items-center gap-1 text-brand">
                + new file <ArrowRight className="h-3 w-3" />
              </span>
            </div>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Agents"
            description="Parallel agents — each with its own model, budget and output"
            action={<Badge tone="neutral">3 active</Badge>}
          />
          <CardBody className="space-y-2.5">
            {agents.map((a, i) => (
              <AgentCard key={a.id} agent={a} index={i} />
            ))}
            <div className="rounded-xl border border-dashed border-border px-3.5 py-2.5 text-[11px] text-faint">
              Add an agent — pick a model, set a budget, drop it into the session.
            </div>
          </CardBody>
        </Card>
      </div>

      {/* ── Terminal ── */}
      <div className="mt-5">
        <Terminal />
      </div>
    </div>
  );
}
