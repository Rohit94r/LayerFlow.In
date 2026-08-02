"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SectionHeading, Reveal } from "@/components/ui/reveal";
import { USE_CASES } from "@/lib/data/marketing";
import {
  Code2,
  LifeBuoy,
  Shuffle,
  PiggyBank,
  Briefcase,
  GraduationCap,
  Users,
  ChevronDown,
} from "@/components/ui/icons";
import type { LucideIcon } from "@/components/ui/icons";

const ICONS: Record<string, LucideIcon> = {
  "code": Code2,
  "lifebuoy": LifeBuoy,
  "shuffle": Shuffle,
  "piggy-bank": PiggyBank,
  "briefcase": Briefcase,
  "graduation-cap": GraduationCap,
  "users": Users,
};

export default function UseCases() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="use-cases" className="relative py-16 sm:py-20">
      <div className="absolute inset-0 grid-lines opacity-30" aria-hidden />
      <div className="relative mx-auto max-w-4xl px-5 sm:px-8">
        <SectionHeading

          title={
            <>
              Made for people who{" "}
              <span className="text-brand">live in AI tools</span>
            </>
          }
          description="Founders, writers, students, engineers — anyone whose work spans multiple AI models. Tap a topic to see how it works."
        />

        <div className="mt-10 space-y-3">
          {USE_CASES.map((uc, i) => {
            const Icon = ICONS[uc.icon] ?? LifeBuoy;
            const isOpen = open === i;
            return (
              <Reveal key={uc.title} delay={(i % 3) * 0.05}>
                <div
                  className={`overflow-hidden rounded-2xl border transition-colors ${
                    isOpen ? "border-brand/30 bg-surface-2/60" : "border-border bg-surface-2/30 hover:border-border-strong"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center gap-4 px-5 py-4 text-left"
                  >
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors ${
                        isOpen
                          ? "border-brand/40 bg-brand/10 text-brand"
                          : "border-border bg-surface-2 text-muted"
                      }`}
                    >
                      <Icon className="h-4.5 w-4.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-semibold text-ink">{uc.title}</span>
                    </span>
                    <span
                      className={`font-mono text-xs transition-colors ${
                        isOpen ? "text-brand" : "text-faint"
                      }`}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-faint transition-transform duration-200 ${
                        isOpen ? "rotate-180 text-brand" : ""
                      }`}
                    />
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5">
                          <p className="text-sm leading-relaxed text-muted">{uc.description}</p>
                          <p className="mt-3 rounded-xl border border-brand/15 bg-brand/5 px-3.5 py-2.5 font-mono text-[11px] leading-relaxed text-brand/90">
                            {uc.example}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
