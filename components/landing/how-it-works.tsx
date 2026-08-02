"use client";

import { SectionHeading, Reveal } from "@/components/ui/reveal";
import { Sparkles, Bot, TerminalSquare, Send, Wand2 } from "@/components/ui/icons";
import { motion } from "framer-motion";
import type { LucideIcon } from "@/components/ui/icons";

const STEPS: { icon: LucideIcon; title: string; description: string; detail: string }[] = [
  {
    icon: Sparkles,
    title: "Write plain English",
    description: "No prompt engineering, no setup, no API keys. Say what you want in a sentence — or paste a messy AI chat you're stuck on.",
    detail: "Source detected automatically · works with partial threads",
  },
  {
    icon: Wand2,
    title: "Click Improve",
    description: "Your vague ask becomes a precise prompt — context, constraints, examples and output format — scored from 0 to 100.",
    detail: "Prompt Score across clarity, context, format & cost",
  },
  {
    icon: Bot,
    title: "Agents run it — web or terminal",
    description: "Implement, review and test agents work in parallel with their own models. Watch it all live in the browser terminal.",
    detail: "Same session in the `lf` CLI · cost checked before it runs",
  },
  {
    icon: Send,
    title: "Continue anywhere",
    description: "Every run is saved as a Context Passport with a Continue Pack — pick up in any model, never re-explain your work.",
    detail: "Cheapest good-enough model recommended with a reason",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-16 sm:py-20">
      <div className="absolute inset-0 grid-lines opacity-40" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading

          title={
            <>
              From plain English to{" "}
              <span className="text-brand">shipped code</span>
            </>
          }
          description="Improve the prompt, run it with agents, keep every bit of context. Any model, any tool — one memory."
        />

        <div className="relative mt-12">
          <motion.div
            className="absolute left-0 right-0 top-12 hidden h-px origin-left bg-gradient-to-r from-transparent via-brand/40 to-transparent lg:block"
            aria-hidden
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
          />
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {STEPS.map((step, i) => (
              <Reveal key={step.title} delay={i * 0.1}>
                <div className="relative">
                  <div className="relative z-10 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-surface text-brand shadow-lg">
                    <step.icon className="h-5 w-5" />
                    <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-[#0e1416]">
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-ink">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{step.description}</p>
                  <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-brand">
                    <span className="h-1 w-1 rounded-full bg-brand" />
                    {step.detail}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
