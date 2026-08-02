"use client";

import { useEffect, useRef } from "react";
import { animate, motion, useInView } from "framer-motion";
import { CheckCircle2 } from "@/components/ui/icons";
import { Reveal, SectionHeading } from "@/components/ui/reveal";

const PIPELINE = [
  { label: "Cleaning", time: "0.4s" },
  { label: "Compressing", time: "1.2s" },
  { label: "Improving", time: "1.8s" },
  { label: "Pricing", time: "0.2s" },
  { label: "Suggesting", time: "0.3s" },
  { label: "Packing", time: "0.2s" },
];

const STATS: { to: number; prefix: string; suffix: string; label: string }[] = [
  { to: 88, prefix: "", suffix: "%", label: "context removed" },
  { to: 20, prefix: "~", suffix: "s", label: "to a full report" },
  { to: 1, prefix: "¢", suffix: "", label: "median run cost" },
];

function Counter({
  to,
  prefix,
  suffix,
  label,
}: {
  to: number;
  prefix: string;
  suffix: string;
  label: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  useEffect(() => {
    if (!inView || !ref.current) return;
    const controls = animate(0, to, {
      duration: 1.8,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        if (ref.current) {
          ref.current.textContent = `${prefix}${Math.round(v)}${suffix}`;
        }
      },
    });
    return () => controls.stop();
  }, [inView, to, prefix, suffix]);

  return (
    <div className="rounded-2xl border border-border bg-surface/60 p-4">
      <p className="text-2xl font-bold text-brand">
        <span ref={ref}>
          {prefix}0{suffix}
        </span>
      </p>
      <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-faint">{label}</p>
    </div>
  );
}

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
                {STATS.map((s) => (
                  <Counter key={s.label} {...s} />
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
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-2 font-mono text-[10px] font-bold text-brand">
                      {String(i + 1).padStart(2, "0")}
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
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-faint" />
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
