"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  LifeBuoy,
  Brain,
  Search,
  History,
  Bot,
  Cpu,
  Library,
  KeyRound,
  FolderKanban,
  Wand2,
  Play,
  Scissors,
  Layers,
  ClipboardList,
  BarChart3,
} from "@/components/ui/icons";
import type { LucideIcon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";

type Feature = {
  icon: LucideIcon;
  title: string;
  description: string;
  why: string;
  steps: string[];
  group: GroupId;
};

const GROUPS = [
  { id: "code", label: "Code" },
  { id: "rescue", label: "Rescue" },
  { id: "context", label: "Context" },
  { id: "workspace", label: "Workspace & models" },
] as const;

type GroupId = (typeof GROUPS)[number]["id"];

const GROUP_LABEL: Record<GroupId, string> = {
  code: "Code",
  rescue: "Rescue",
  context: "Context",
  workspace: "Workspace & models",
};

const FEATURES: Feature[] = [
  {
    icon: FolderKanban,
    title: "Coding Workspace",
    description: "A dedicated workspace for building with AI — sessions, prompts, runs and history live together, so coding never loses the thread.",
    why: "One place for the whole build loop — plan, code, test, ship.",
    steps: ["Workspace opened", "Context attached", "Code with AI"],
    group: "code",
  },
  {
    icon: Wand2,
    title: "Improve Prompt",
    description: "Polish any prompt before you spend tokens — rewrite, tighten and score it against your best past prompts.",
    why: "Better prompts in, better answers out, without burning budget.",
    steps: ["Prompt pasted", "Rewritten + scored", "Reused everywhere"],
    group: "code",
  },
  {
    icon: Bot,
    title: "Build Agents",
    description: "Compose agents from prompts, models and budgets. Approvals gate the important steps and every run is logged.",
    why: "Your workflows run themselves — you approve what matters.",
    steps: ["Agent defined", "Approval requested", "Runs logged"],
    group: "code",
  },
  {
    icon: Play,
    title: "Run Sessions",
    description: "Start a session, pick a model and watch it run in real time — in the browser or the lf terminal.",
    why: "Start on the web, finish in the terminal — same session, same context.",
    steps: ["Session started", "Model chosen", "Streaming output"],
    group: "code",
  },
  {
    icon: LifeBuoy,
    title: "Rescue Chat",
    description: "Hit the Claude or ChatGPT limit? Paste the dead conversation and continue instantly — in any model.",
    why: "A dead chat becomes a workable session in under a minute.",
    steps: ["Limit reached", "Paste into LayerFlow", "Continue elsewhere"],
    group: "rescue",
  },
  {
    icon: Scissors,
    title: "Smart Compress",
    description: "Long threads shrink automatically — older turns are summarized so the important context survives.",
    why: "No more losing the plot in a 200-message thread.",
    steps: ["Thread too long", "Old turns compressed", "Context preserved"],
    group: "rescue",
  },
  {
    icon: Layers,
    title: "Continue Pack",
    description: "Export the full conversation as a pack — import it into any chat or agent and continue where you left off.",
    why: "Your work travels with you, not stuck in one app.",
    steps: ["Pack exported", "Imported anywhere", "Context intact"],
    group: "rescue",
  },
  {
    icon: ClipboardList,
    title: "AI Conversation Summary",
    description: "Every finished conversation gets a distilled summary — automatically, without you asking.",
    why: "Know what was decided without rereading the whole thread.",
    steps: ["Chat finished", "Summary generated", "Searchable later"],
    group: "context",
  },
  {
    icon: Library,
    title: "Prompt Library",
    description: "Prompts are versioned, scored and shared across the workspace — reuse your best work instead of reinventing it.",
    why: "Your best prompts compound.",
    steps: ["Prompt improved", "Scored 0–100", "Reused by the team"],
    group: "context",
  },
  {
    icon: Search,
    title: "Context Search",
    description: "Keyword and semantic search across chats, memories, prompts and runs — find the answer you already paid for.",
    why: "Reuse what you already solved.",
    steps: ["Search typed", "Everything scanned", "Answer surfaced"],
    group: "context",
  },
  {
    icon: Brain,
    title: "Learning Memory",
    description: "Facts from chats and runs are extracted into durable memory and injected into future sessions automatically.",
    why: "Your lessons compound instead of living in scrollback.",
    steps: ["Facts extracted", "Stored as memory", "Injected next time"],
    group: "context",
  },
  {
    icon: History,
    title: "AI Work Ledger",
    description: "A git-like timeline of every chat, run and decision — with the models used and what they cost.",
    why: "Full history, full accountability.",
    steps: ["Every action logged", "Models + costs recorded", "Full audit trail"],
    group: "workspace",
  },
  {
    icon: BarChart3,
    title: "Cost Analytics",
    description: "Spend per project, model and team member — with budgets that stop the spend before it overshoots.",
    why: "Every dollar accounted for — before it's spent.",
    steps: ["Spend tracked", "Budgets set", "Caps enforced"],
    group: "workspace",
  },
  {
    icon: Cpu,
    title: "Models",
    description: "OpenAI, Anthropic, Google, Groq, DeepSeek, Kimi and xAI — pick the best model for each job, with automatic failover.",
    why: "Always the right model for the task.",
    steps: ["Models compared", "Best one chosen", "Failover built in"],
    group: "workspace",
  },
  {
    icon: KeyRound,
    title: "BYOK",
    description: "Bring your own API keys. Pay your provider's prices, keep full control and never touch resold credits. Keys are encrypted at rest.",
    why: "Your keys, your prices, your control.",
    steps: ["Your key added", "Provider pricing applied", "No resold credits"],
    group: "workspace",
  },
];

const N = FEATURES.length;

function FlowVisual({ steps }: { steps: string[] }) {
  return (
    <div className="rounded-2xl border border-border bg-surface-2/50 p-4 sm:p-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-faint">Example</p>
      <div className="mt-3">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="flex flex-col items-center self-stretch">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-brand/30 bg-surface font-mono text-[10px] font-bold text-brand">
                {i + 1}
              </span>
              {i < steps.length - 1 ? (
                <span className="my-1 h-4 w-px bg-border" aria-hidden />
              ) : null}
            </div>
            <span className="pb-0.5 text-xs font-medium text-muted">{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeaturePanel({ f, i }: { f: Feature; i: number }) {
  return (
    <div className="relative flex h-full flex-col rounded-3xl border border-brand/25 bg-surface p-6 shadow-[0_24px_80px_-24px_rgba(249,115,22,0.25)] sm:p-8">
      <div
        className="pointer-events-none absolute inset-0 rounded-3xl border border-brand/30"
        aria-hidden
      />
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-brand/25 bg-surface-2 text-brand">
            <f.icon className="h-7 w-7" />
          </div>
          <div>
            <p className="font-mono text-2xl font-bold leading-none tracking-tight text-brand">
              {String(i + 1).padStart(2, "0")}
            </p>
            <h3 className="mt-1.5 text-xl font-semibold tracking-tight text-ink sm:text-2xl">
              {f.title}
            </h3>
          </div>
        </div>
        <div className="mt-1 flex shrink-0 flex-col items-end gap-1.5">
          <span className="rounded-full border border-border bg-surface-2 px-2.5 py-1 font-mono text-[10px] font-bold text-faint">
            {i + 1} / {N}
          </span>
          <span className="rounded-full bg-brand/10 px-2.5 py-1 font-mono text-[10px] font-bold text-brand">
            {GROUP_LABEL[f.group]}
          </span>
        </div>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-muted">{f.description}</p>
      <div className="mt-auto pt-5">
        <FlowVisual steps={f.steps} />
        <p className="mt-4 text-[10px] font-bold uppercase tracking-widest text-brand">
          Why it matters
        </p>
        <p className="mt-1 text-sm font-medium text-ink">{f.why}</p>
      </div>
    </div>
  );
}

function FeaturesDesktop() {
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const wheelLock = useRef(0);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const now = Date.now();
      if (now - wheelLock.current < 240) return;
      wheelLock.current = now;
      const dir = e.deltaY > 0 ? 1 : -1;
      setActive((a) => Math.min(N - 1, Math.max(0, a + dir)));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  return (
    <section id="features" className="relative hidden lg:block">
      <div className="absolute inset-0 grid-lines opacity-30" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <div className="sticky top-0 flex min-h-screen flex-col justify-center py-12">
          <div className="grid grid-cols-[minmax(0,5fr)_minmax(0,7fr)] items-center gap-12 xl:gap-16">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand">Features</p>
              <h2 className="mt-4 text-4xl font-semibold tracking-tight text-ink xl:text-5xl xl:leading-[1.12]">
                Code with AI —
                <br />
                keep every bit of context alive
              </h2>
              <p className="mt-5 max-w-md text-base leading-relaxed text-muted">
                LayerFlow is the AI workspace for teams that build in the browser
                and the terminal — chat across any model, rescue dead chats,
                run agents, and keep one memory everywhere.
              </p>

              <div
                ref={listRef}
                className="mt-8 max-w-sm space-y-0.5 rounded-2xl border border-border bg-surface/60 p-2.5"
                aria-label="Browse features"
              >
                {GROUPS.map((g) => (
                  <Fragment key={g.id}>
                    <div className="px-3 pb-1 pt-3 text-[10px] font-bold uppercase tracking-widest text-faint first:pt-1">
                      {g.label}
                    </div>
                    {FEATURES.map((f, i) =>
                      f.group === g.id ? (
                        <button
                          key={f.title}
                          onClick={() => setActive(i)}
                          aria-current={active === i ? "step" : undefined}
                          className={`group flex w-full items-center gap-2.5 rounded-xl px-3 py-1.5 text-left transition-colors duration-200 ${
                            active === i ? "bg-brand/10" : "hover:bg-surface-2"
                          }`}
                        >
                          <span
                            className={`font-mono text-[10px] font-bold transition-colors duration-200 ${
                              active === i ? "text-brand" : "text-faint"
                            }`}
                          >
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span
                            className={`h-1 w-1 shrink-0 rounded-full transition-colors duration-200 ${
                              active === i ? "bg-brand" : "bg-border"
                            }`}
                          />
                          <span
                            className={`text-[13px] transition-colors duration-200 ${
                              active === i ? "font-medium text-ink" : "text-muted group-hover:text-ink"
                            }`}
                          >
                            {f.title}
                          </span>
                        </button>
                      ) : null,
                    )}
                  </Fragment>
                ))}
              </div>

              <p className="mt-3 text-[11px] text-faint">
                Scroll over the list to switch · click to jump
              </p>

              <div className="mt-7">
                <Link href="/agents">
                  <Button size="lg" icon={<ArrowRight className="h-4 w-4" />}>
                    Try LayerFlow
                  </Button>
                </Link>
              </div>
            </div>

            <div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  initial={{ opacity: 0, y: 28, scale: 0.97, filter: "blur(6px)" }}
                  animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -28, scale: 0.97, filter: "blur(6px)" }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                  <FeaturePanel f={FEATURES[active]} i={active} />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturesMobile() {
  return (
    <div className="lg:hidden">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand">Features</p>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Code with AI —
          <br />
          <span className="text-brand">keep every bit of context alive</span>
        </h2>
        <p className="mt-4 max-w-md text-base leading-relaxed text-muted">
          LayerFlow is the AI workspace for teams that build in the browser and
          the terminal — chat across any model, rescue dead chats, run agents,
          and keep one memory everywhere.
        </p>
      </div>

      <div className="mx-auto mt-10 max-w-7xl space-y-6 px-5 sm:px-8">
        {GROUPS.map((g) => (
          <div key={g.id} className="space-y-4">
            <div className="flex items-center gap-2.5 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-faint">
                {g.label}
              </h3>
              <div className="h-px flex-1 bg-border" aria-hidden />
            </div>
            {FEATURES.filter((f) => f.group === g.id).map((f, j) => (
              <motion.div
                key={f.title}
                className="rounded-3xl border border-border bg-surface/70 p-6"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5 }}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-brand/25 bg-surface-2 text-brand">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-faint">
                      {String(j + 1).padStart(2, "0")} · {g.label}
                    </p>
                    <h4 className="text-lg font-semibold tracking-tight text-ink">{f.title}</h4>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted">{f.description}</p>
                <div className="mt-5">
                  <FlowVisual steps={f.steps} />
                </div>
                <p className="mt-4 text-[10px] font-bold uppercase tracking-widest text-brand">Why it matters</p>
                <p className="mt-1 text-sm font-medium text-ink">{f.why}</p>
              </motion.div>
            ))}
          </div>
        ))}
      </div>

      <div className="mt-10 px-5 text-center sm:px-8">
        <Link href="/agents">
          <Button size="lg" icon={<ArrowRight className="h-4 w-4" />}>
            Try LayerFlow
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function Features() {
  const reduceMotion = useReducedMotion();
  return (
    <section id="features" className="relative">
      {reduceMotion ? <FeaturesMobile /> : (
        <>
          <FeaturesDesktop />
          <FeaturesMobile />
        </>
      )}
    </section>
  );
}
