"use client";

import { SectionHeading, Reveal } from "@/components/ui/reveal";
import { ClipboardPaste, FileDown, Wand2, Send } from "lucide-react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

const STEPS: { icon: LucideIcon; title: string; description: string; detail: string }[] = [
  {
    icon: ClipboardPaste,
    title: "Paste any conversation",
    description: "Copy your ChatGPT, Claude, Gemini, DeepSeek or Kimi thread — even after you've hit a limit.",
    detail: "Source detected automatically · works with partial threads",
  },
  {
    icon: FileDown,
    title: "Get your Context Passport",
    description: "LayerFlow extracts the goal, decisions, constraints, failures and next action — and shows you exactly what it removed.",
    detail: "8,000 words → ~1,000 words of useful context",
  },
  {
    icon: Wand2,
    title: "Improve your next prompt",
    description: "A scored, copy-ready prompt that's clearer, cheaper and more likely to get the right answer.",
    detail: "Prompt Score across clarity, context, format & cost",
  },
  {
    icon: Send,
    title: "Continue in any model",
    description: "Copy the Continue Pack, paste it into another AI, and pick up exactly where you stopped.",
    detail: "Cheapest good-enough model recommended with a reason",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-16 sm:py-20">
      <div className="absolute inset-0 grid-lines opacity-40" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          eyebrow="How it works"
          title={
            <>
              From messy chat to{" "}
              <span className="text-brand">action-ready AI work</span>
            </>
          }
          description="One paste. Four steps. Every model you use now shares the same memory."
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
