"use client";

import { motion } from "framer-motion";
import { journeySteps } from "@/lib/marketing-content";
import Reveal from "./Reveal";

export default function Journey() {
  return (
    <section className="border-y border-border bg-bg-soft">
      <div className="mx-auto max-w-7xl px-6 py-16 sm:px-8 sm:py-20">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-medium text-brand">Your AI workflow</p>
            <h2 className="mt-3 font-sans text-2xl font-semibold text-ink sm:text-3xl">
              One workspace for the full loop
            </h2>
            <p className="mt-3 text-muted">
              From first prompt to deployed app — same workspace, same cost
              controls, same history.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.08}>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            {journeySteps.map((step, i) => (
              <div key={step} className="flex items-center gap-2 sm:gap-3">
                <motion.span
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05, duration: 0.35 }}
                  className="rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-ink sm:px-4 sm:py-2.5 sm:text-[15px]"
                >
                  {step}
                </motion.span>
                {i < journeySteps.length - 1 && (
                  <span className="text-faint" aria-hidden>
                    →
                  </span>
                )}
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
