"use client";

import { useEffect, useState } from "react";
import { SectionHeading, Reveal } from "@/components/ui/reveal";
import { Sparkles, Scissors, Bot, Wallet, CheckCircle2 } from "@/components/ui/icons";
import type { LucideIcon } from "@/components/ui/icons";

const FEATURES: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: Sparkles,
    title: "Prompt management",
    description: "Plain English in, precise prompt out. Clarity, constraints, examples and output format — scored 0–100.",
  },
  {
    icon: Scissors,
    title: "Auto context cutting",
    description: "Long chats and repo context get cut to only what the task needs — token waste removed before the run.",
  },
  {
    icon: Bot,
    title: "Multi-agent runs",
    description: "Implement, review and test agents work in parallel, each with its own model and budget.",
  },
  {
    icon: Wallet,
    title: "Cost-checked before it runs",
    description: "Every command estimates dollars across models first and picks the cheapest good-enough one.",
  },
];

const TERMINAL_LINES: { id: number; type: string; text: string }[] = [
  { id: 1, type: "cmd", text: "lf run \"build a landing page\"" },
  { id: 2, type: "out", text: "✓ prompt improved (92/100) — clarity + format fixed" },
  { id: 3, type: "out", text: "✓ context cut: 8,200 tokens → 1,340 (auto)" },
  { id: 4, type: "out", text: "✓ model picked: gpt-4.1 · est. $0.09" },
  { id: 5, type: "info", text: "implement agent started · 3 files to touch" },
  { id: 6, type: "info", text: "review agent started · checking diff" },
  { id: 7, type: "ok", text: "✓ build passed · ready to ship" },
];

export default function TerminalSection() {
  const [visible, setVisible] = useState(0);
  const [paused, setPaused] = useState(false);
  const done = visible >= TERMINAL_LINES.length;

  useEffect(() => {
    if (paused || done) return;
    const t = setInterval(() => {
      setVisible((v) => Math.min(v + 1, TERMINAL_LINES.length));
    }, 700);
    return () => clearInterval(t);
  }, [paused, done]);

  useEffect(() => {
    if (paused || done) return;
    const t = setTimeout(() => setVisible(0), 2600);
    return () => clearTimeout(t);
  }, [paused, done]);

  return (
    <section id="terminal" className="relative scroll-mt-20 py-16 sm:py-20">
      <div className="absolute inset-0 grid-lines opacity-30" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading

          title={
            <>
              A terminal that{" "}
              <span className="text-brand">runs like a team</span>
            </>
          }
          description="Install once, run from anywhere. The CLI auto-improves your prompt, cuts unused context, checks cost, and runs multiple agents — then saves everything to your workspace."
        />

        <div className="mt-12 grid items-center gap-10 lg:grid-cols-2">
          {/* Terminal mock */}
          <Reveal>
            <div
              className="overflow-hidden rounded-2xl border border-border bg-[#0a0e10] shadow-2xl shadow-black/40"
              onMouseEnter={() => setPaused(true)}
              onMouseLeave={() => setPaused(false)}
            >
              <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-rose-500/70" />
                  <span className="h-3 w-3 rounded-full bg-amber-500/70" />
                  <span className="h-3 w-3 rounded-full bg-emerald-500/70" />
                  <span className="ml-3 font-mono text-xs text-white/40">layerflow — zsh</span>
                </div>
                {paused ? (
                  <span className="font-mono text-[10px] uppercase tracking-widest text-emerald-400">
                    ● paused
                  </span>
                ) : done ? (
                  <span className="font-mono text-[10px] uppercase tracking-widest text-faint">
                    replaying…
                  </span>
                ) : null}
              </div>
              <div className="h-[300px] overflow-hidden p-4 font-mono text-[13px] leading-relaxed">
                {TERMINAL_LINES.slice(0, visible).map((l) => (
                  <div key={l.id} className="flex gap-2">
                    {l.type === "cmd" ? <span className="text-brand">$</span> : <span className="w-2" />}
                    <span
                      className={
                        l.type === "cmd"
                          ? "text-white"
                          : l.type === "ok"
                            ? "text-emerald-400"
                            : l.type === "info"
                              ? "text-muted"
                              : "text-white/70"
                      }
                    >
                      {l.text}
                    </span>
                  </div>
                ))}
                <div className="mt-1 flex items-center gap-1.5 text-white/80">
                  <span className="text-brand">$</span>
                  <span className="h-4 w-2 animate-pulse bg-brand/80" />
                </div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-faint">
              <span className="rounded-md border border-border bg-surface-2 px-2 py-1 font-mono text-[10px] text-muted">lf</span>
              <span>One session across the web app and the CLI — same agents, same workspace.</span>
            </div>
          </Reveal>

          {/* Feature list */}
          <div className="space-y-4">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={0.1 + i * 0.08}>
                <div className="card card-hover flex gap-4 p-5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-2 text-brand">
                    <f.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-base font-semibold text-ink">{f.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{f.description}</p>
                  </div>
                </div>
              </Reveal>
            ))}
            <Reveal delay={0.5}>
              <p className="flex items-center gap-2 px-1 text-xs text-faint">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                Same sessions in the web workspace — start in one, continue in the other.
              </p>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
