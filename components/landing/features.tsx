"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  LifeBuoy,
  BookUser,
  FileDown,
  Wand2,
  DollarSign,
  CopyCheck,
  KeyRound,
  Cpu,
  FolderKanban,
  Search,
  Brain,
  History,
} from "@/components/ui/icons";
import type { LucideIcon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";

type Feature = {
  icon: LucideIcon;
  title: string;
  description: string;
  why: string;
  steps: string[];
};

const FEATURES: Feature[] = [
  {
    icon: LifeBuoy,
    title: "Limit Rescue",
    description: "Hit the Claude or ChatGPT limit? Paste the conversation and continue instantly — without rebuilding context.",
    why: "Dead-end chats become workable sessions in under a minute.",
    steps: ["Claude limit reached", "Paste into LayerFlow", "Continue in Gemini"],
  },
  {
    icon: BookUser,
    title: "Context Passport",
    description: "A portable memory package: goal, current state, decisions, constraints, failures, next action and output format.",
    why: "Your work survives any model or tool switch.",
    steps: ["State captured", "Goal + decisions saved", "Restored in any model"],
  },
  {
    icon: FileDown,
    title: "Smart Compress",
    description: "15,000 words in, ~1,000 words out. Only the useful context survives — with a clear reduction count.",
    why: "Pay for signal, not filler.",
    steps: ["15,000 words in", "Compressed to ~1,000", "Useful context survives"],
  },
  {
    icon: Wand2,
    title: "Improve Prompt",
    description: "Your vague ask becomes a precise prompt — context, constraints, examples and output format — scored from 0 to 100.",
    why: "Vague ideas become precise instructions.",
    steps: ["Vague prompt written", "Scored & rewritten", "92/100 with constraints"],
  },
  {
    icon: DollarSign,
    title: "Cost Check",
    description: "Real dollar estimates across Claude, GPT, Gemini, DeepSeek, Kimi and Groq — not just token counts.",
    why: "Know the price before you run.",
    steps: ["Task typed", "6 models priced", "Cheapest good pick chosen"],
  },
  {
    icon: CopyCheck,
    title: "Continue Pack",
    description: "A copy-ready continuation package. Paste it into any AI and continue exactly where you stopped.",
    why: "Pick up exactly where you left off.",
    steps: ["Session finished", "Pack generated", "Pasted into any AI"],
  },
  {
    icon: KeyRound,
    title: "BYOK",
    description: "Bring your own API keys. Pay your provider's prices, keep full control, and never touch resold credits.",
    why: "Your keys, your prices, your control.",
    steps: ["Your key added", "Provider pricing applied", "No resold credits"],
  },
  {
    icon: Cpu,
    title: "Best Model Suggestion",
    description: "The right model for the task — with the reasoning explained. Cheap first, strong when it matters.",
    why: "Always the right model for the job.",
    steps: ["Task analyzed", "Models ranked by cost + quality", "Best option runs"],
  },
  {
    icon: FolderKanban,
    title: "Workspace",
    description: "Projects, saved context, prompt library, timeline and history — your AI work, organized and durable.",
    why: "Every project, prompt and run in one place.",
    steps: ["Project created", "Prompts + runs tracked", "History preserved"],
  },
  {
    icon: Search,
    title: "Context Search",
    description: "Search every saved passport, prompt and decision. Find the answer you already paid for.",
    why: "Reuse what you already solved.",
    steps: ["Search typed", "Passports scanned", "Answer surfaced"],
  },
  {
    icon: Brain,
    title: "Learning Memory",
    description: "Pin what worked so future sessions start from your hard-won lessons, not from scratch.",
    why: "Never repeat a solved problem.",
    steps: ["Lesson learned", "Pinned to memory", "Next session starts smarter"],
  },
  {
    icon: History,
    title: "AI Work Ledger",
    description: "A git-like timeline of everything done with AI: rescues, prompts, models, decisions and costs.",
    why: "Full history, full accountability.",
    steps: ["Every action logged", "Models + costs recorded", "Full audit trail"],
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
        <span className="mt-1 shrink-0 rounded-full border border-border bg-surface-2 px-2.5 py-1 font-mono text-[10px] font-bold text-faint">
          {i + 1} / {N}
        </span>
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
                LayerFlow helps developers rescue AI conversations, improve
                prompts, cut costs, and continue across any model — one memory,
                everywhere.
              </p>

              <div
                ref={listRef}
                className="mt-8 max-w-sm space-y-0.5 rounded-2xl border border-border bg-surface/60 p-2.5"
                aria-label="Browse features"
              >
                {FEATURES.map((f, i) => (
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
                ))}
              </div>

              <p className="mt-3 text-[11px] text-faint">
                Scroll over the list to switch · click to jump
              </p>

              <div className="mt-7">
                <Link href="/code">
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
          LayerFlow helps developers rescue AI conversations, improve prompts,
          cut costs, and continue across any model — one memory, everywhere.
        </p>
      </div>

      <div className="mx-auto mt-10 max-w-7xl space-y-4 px-5 sm:px-8">
        {FEATURES.map((f, i) => (
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
                  {String(i + 1).padStart(2, "0")}
                </p>
                <h3 className="text-lg font-semibold tracking-tight text-ink">{f.title}</h3>
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

      <div className="mt-10 px-5 text-center sm:px-8">
        <Link href="/code">
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
