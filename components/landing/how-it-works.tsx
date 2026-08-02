"use client";

import { SectionHeading } from "@/components/ui/reveal";
import { motion } from "framer-motion";

const STEPS: { title: string; description: string; hint: string }[] = [
  {
    title: "Write plain English",
    description: "No prompt engineering, no setup, no API keys. Say what you want in a sentence — or paste a messy AI chat you're stuck on.",
    hint: "$ lf run \"build a landing page\"",
  },
  {
    title: "Click Improve",
    description: "Your vague ask becomes a precise prompt — context, constraints, examples and output format — scored from 0 to 100.",
    hint: "score 92/100 · 3 constraints added",
  },
  {
    title: "Agents run it — web or terminal",
    description: "Implement, review and test agents work in parallel with their own models. Watch it all live in the browser terminal.",
    hint: "implement + review + test · in parallel",
  },
  {
    title: "Continue anywhere",
    description: "Every run is saved as a Context Passport with a Continue Pack — pick up in any model, never re-explain your work.",
    hint: "passport saved · continue pack copied",
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

        <div className="relative mt-14">
          <motion.div
            className="absolute left-0 right-0 top-6 hidden h-0.5 origin-left bg-gradient-to-r from-transparent via-brand/40 to-transparent lg:block"
            style={{ originX: 0 }}
            aria-hidden
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.4, ease: "easeInOut" }}
          />

          <div className="grid gap-10 lg:grid-cols-4 lg:gap-8">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.title}
                className="relative flex flex-col"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 + i * 0.25, duration: 0.5 }}
              >
                <div className="flex items-center gap-3 lg:flex-col lg:items-start">
                  <motion.span
                    className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-brand/30 bg-surface font-mono text-sm font-bold text-brand shadow-[0_0_24px_rgba(249,115,22,0.15)]"
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 20,
                      delay: 0.3 + i * 0.25,
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </motion.span>
                  <h3 className="text-base font-semibold tracking-tight text-ink lg:mt-4">
                    {step.title}
                  </h3>
                </div>
                <p className="mt-2.5 text-sm leading-relaxed text-muted lg:mt-3">{step.description}</p>
                <code className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 font-mono text-[11px] text-brand">
                  <span className="text-faint">▸</span>
                  {step.hint}
                </code>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
