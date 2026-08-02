"use client";

import { motion } from "framer-motion";
import { Sparkles, FileDown, Wand2, DollarSign, Cpu, Copy } from "@/components/ui/icons";
import { Reveal, SectionHeading } from "@/components/ui/reveal";

const PIPELINE = [
  { icon: Sparkles, label: "Cleaning", time: "0.4s" },
  { icon: FileDown, label: "Compressing", time: "1.2s" },
  { icon: Wand2, label: "Improving", time: "1.8s" },
  { icon: DollarSign, label: "Pricing", time: "0.2s" },
  { icon: Cpu, label: "Suggesting", time: "0.3s" },
  { icon: Copy, label: "Packing", time: "0.2s" },
];

export default function MagicMoment() {
  return (
    <section id="magic" className="relative overflow-hidden py-16 sm:py-20">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brand/[0.04] to-transparent" aria-hidden />
      <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <SectionHeading
              align="left"
              title={
                <>
                  Hit a limit at 11pm?
                  <br />
                  <span className="text-brand">We finish the thought.</span>
                </>
              }
              description="The cap always lands mid-task. Paste the thread, watch LayerFlow clean, compress, improve, price and pack it — in seconds, for cents."
            />

            <Reveal delay={0.2}>
              <div className="mt-8 grid grid-cols-3 gap-4">
                {[
                  { value: "88%", label: "context removed" },
                  { value: "~20s", label: "to a full report" },
                  { value: "¢1", label: "median run cost" },
                ].map((s) => (
                  <div key={s.label} className="rounded-2xl border border-border bg-surface/60 p-4">
                    <p className="text-2xl font-bold text-brand">{s.value}</p>
                    <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-faint">{s.label}</p>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.15}>
            <div className="glass-card relative overflow-hidden p-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-ink">Rescue pipeline</span>
                <span className="text-xs text-faint">live · mock run</span>
              </div>

              <div className="mt-5 space-y-3">
                {PIPELINE.map((step, i) => (
                  <motion.div
                    key={step.label}
                    className="flex items-center gap-3 rounded-xl border border-border bg-surface/70 px-4 py-3"
                    initial={{ opacity: 0, x: -16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + i * 0.28 }}
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-2 text-brand">
                      <step.icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-ink">{step.label}</span>
                        <span className="text-[10px] text-faint">{step.time}</span>
                      </div>
                      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface-2">
                        <motion.div
                          className="h-full rounded-full bg-brand"
                          initial={{ width: "0%" }}
                          whileInView={{ width: "100%" }}
                          viewport={{ once: true }}
                          transition={{ duration: 1.4, delay: 0.3 + i * 0.28, ease: "easeInOut" }}
                        />
                      </div>
                    </div>
                    {i < PIPELINE.length - 1 ? (
                      <span className="h-5 w-5 shrink-0 text-center text-[9px] text-faint">✓</span>
                    ) : (
                      <motion.span
                        className="shrink-0 rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-bold text-brand"
                        initial={{ opacity: 0, scale: 0.6 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 1.9 }}
                      >
                        done
                      </motion.span>
                    )}
                  </motion.div>
                ))}
              </div>

              <motion.div
                className="mt-5 rounded-xl border border-brand/25 bg-brand/5 px-4 py-3 text-center"
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 2.1 }}
              >
                <p className="text-xs font-semibold text-brand">
                  Continue Pack ready · recommended: Gemini Flash ($0.008)
                </p>
              </motion.div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
