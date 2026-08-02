"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, animate, motion, useInView } from "framer-motion";
import { CheckCircle2, Copy, Play } from "@/components/ui/icons";

const STEPS = [
  { label: "Cleaning", desc: "Removing noise & duplicate context", time: "0.4s" },
  { label: "Compressing", desc: "Smart compression", time: "1.2s" },
  { label: "Improving", desc: "Adds missing constraints", time: "1.8s" },
  { label: "Pricing", desc: "Checks every model", time: "0.2s" },
  { label: "Suggesting", desc: "Picks the best AI", time: "0.3s" },
  { label: "Packing", desc: "Creates your Continue Pack", time: "" },
];

const STEP_MS = 700;
const DONE_MS = 3600;
const RESET_MS = 500;

function Counter({
  to,
  decimals,
  prefix,
  suffix,
  label,
}: {
  to: number;
  decimals: number;
  prefix: string;
  suffix: string;
  label: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  useEffect(() => {
    if (!inView || !ref.current) return;
    const controls = animate(0, to, {
      duration: 1.6,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        if (ref.current) {
          ref.current.textContent = `${prefix}${v.toFixed(decimals)}${suffix}`;
        }
      },
    });
    return () => controls.stop();
  }, [inView, to, decimals, prefix, suffix]);

  return (
    <div className="group/stat rounded-2xl border border-border bg-[#11161C] p-4 transition-[transform,border-color] duration-300 hover:-translate-y-1 hover:border-brand/30">
      <p className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
        <span ref={ref}>
          {prefix}0{suffix}
        </span>
      </p>
      <p className="mt-1.5 text-[11px] font-medium uppercase tracking-wide text-faint">{label}</p>
    </div>
  );
}

export default function MagicMoment() {
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { once: true, margin: "-120px" });
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [runId, setRunId] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!inView) return;
    let alive = true;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let s = 0;
    setStep(0);
    setDone(false);

    const tick = () => {
      if (!alive) return;
      s += 1;
      if (s <= STEPS.length) {
        setStep(s);
        setDone(false);
        timers.push(setTimeout(tick, STEP_MS));
      } else {
        setDone(true);
        timers.push(
          setTimeout(() => {
            if (!alive) return;
            setStep(0);
            setDone(false);
            timers.push(setTimeout(tick, RESET_MS));
          }, DONE_MS),
        );
      }
    };

    timers.push(setTimeout(tick, 350));
    return () => {
      alive = false;
      timers.forEach(clearTimeout);
    };
  }, [inView, runId]);

  const lineProgress = step / STEPS.length;

  const copyPack = async () => {
    try {
      await navigator.clipboard.writeText(
        "Continue Pack ready — paste into any AI. Goal, state, decisions and next action included.",
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <section
      id="magic"
      ref={sectionRef}
      className="relative overflow-hidden py-24 sm:py-32"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brand/[0.02] to-transparent" aria-hidden />
      <div
        className="pointer-events-none absolute -left-48 -top-48 h-[560px] w-[560px] rounded-full bg-brand/[0.07] blur-[130px]"
        aria-hidden
      />
      <div className="grid-lines absolute inset-0 opacity-[0.06]" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
        aria-hidden
      />

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid items-center gap-16 lg:grid-cols-[2fr_3fr] lg:gap-20">
          <div>
            <h2 className="text-4xl font-semibold leading-[1.06] tracking-tight text-ink sm:text-5xl lg:text-[64px]">
              Hit a limit at 11pm?
              <br />
              <span className="text-brand">We finish the thought.</span>
            </h2>
            <p className="mt-6 max-w-md text-[17px] leading-relaxed text-muted">
              Paste your conversation. LayerFlow automatically cleans,
              compresses, improves, estimates cost and creates a Continue Pack
              so you can continue instantly in another AI.
            </p>

            <div className="mt-9 grid grid-cols-3 gap-3">
              <Counter to={88} decimals={0} prefix="" suffix="%" label="Context Removed" />
              <Counter to={20} decimals={0} prefix="~" suffix="s" label="Avg Processing Time" />
              <Counter to={0.008} decimals={3} prefix="$" suffix="" label="Average Cost" />
            </div>

            <button
              type="button"
              onClick={() => setRunId((r) => r + 1)}
              className="group mt-10 inline-flex cursor-pointer items-center gap-3 text-sm font-semibold text-ink"
            >
              <span className="grid h-8 w-8 place-items-center rounded-full bg-brand text-[#0e1416] transition-transform duration-300 group-hover:translate-x-1">
                <Play className="h-3 w-3 translate-x-[1px]" />
              </span>
              <span className="relative pb-0.5">
                See it in action
                <span className="absolute inset-x-0 bottom-0 h-[2px] origin-left scale-x-0 rounded-full bg-brand transition-transform duration-300 group-hover:scale-x-100" />
              </span>
            </button>
          </div>

          <div className="relative lg:pl-2">
            <div className="absolute bottom-2 left-[7px] top-2 w-px bg-border" aria-hidden />
            <motion.div
              className="absolute bottom-2 left-[7px] top-2 w-px origin-top bg-brand shadow-[0_0_14px_rgba(249,115,22,0.5)]"
              aria-hidden
              animate={{ scaleY: lineProgress }}
              transition={{ type: "spring", stiffness: 160, damping: 26 }}
            />

            <div className="space-y-3">
              {STEPS.map((st, i) => {
                const n = i + 1;
                const isActive = step === n;
                const completed = done ? true : step > n;
                const pending = !completed && !isActive;
                return (
                  <div key={st.label} className="relative flex items-center gap-4">
                    <div className="relative z-10 flex h-4 w-4 shrink-0 items-center justify-center">
                      <span
                        className={`absolute h-2.5 w-2.5 rounded-full transition-all duration-500 ${
                          completed || isActive ? "bg-brand" : "bg-white/15"
                        }`}
                      />
                      {isActive ? (
                        <motion.span
                          className="absolute h-4 w-4 rounded-full border border-brand/60"
                          animate={{ scale: [1, 1.7], opacity: [0.9, 0] }}
                          transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }}
                        />
                      ) : null}
                    </div>
                    <motion.div
                      className={`group relative flex-1 overflow-hidden rounded-2xl border bg-[#11161C] px-5 py-4 transition-[border-color] duration-500 hover:-translate-y-[3px] ${
                        isActive ? "border-brand/40" : "border-border"
                      }`}
                      animate={{
                        opacity: isActive ? 1 : completed ? 0.85 : 0.45,
                        y: pending ? 10 : 0,
                      }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    >
                      {isActive ? (
                        <motion.span
                          className="absolute inset-x-0 bottom-0 h-[2px] origin-left bg-gradient-to-r from-brand/40 to-brand"
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: 1 }}
                          exit={{ scaleX: 0 }}
                          transition={{ duration: STEP_MS / 1000, ease: "linear" }}
                          aria-hidden
                        />
                      ) : null}
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <span
                            className={`font-mono text-lg font-bold leading-none transition-colors duration-500 ${
                              isActive ? "text-brand" : "text-faint"
                            }`}
                          >
                            {String(n).padStart(2, "0")}
                          </span>
                          <h4 className="text-base font-semibold tracking-tight text-ink">
                            {st.label}
                          </h4>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          {st.time ? (
                            <span
                              className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] transition-colors duration-500 ${
                                isActive ? "bg-brand/15 text-brand" : "text-faint"
                              }`}
                            >
                              {st.time}
                            </span>
                          ) : null}
                          <AnimatePresence mode="popLayout" initial={false}>
                            {completed ? (
                              <motion.span
                                key="check"
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                                transition={{ type: "spring", stiffness: 420, damping: 22 }}
                              >
                                <CheckCircle2 className="h-4 w-4 text-brand" />
                              </motion.span>
                            ) : null}
                          </AnimatePresence>
                        </div>
                      </div>
                      <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{st.desc}</p>
                    </motion.div>
                  </div>
                );
              })}
            </div>

            <div className="relative mt-4 h-[62px]">
              <AnimatePresence>
                {done ? (
                  <motion.div
                    className="absolute inset-x-0 flex items-center justify-between gap-4 rounded-2xl border border-brand/30 bg-[#11161C] px-4 py-3"
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 24 }}
                    transition={{ type: "spring", stiffness: 260, damping: 26 }}
                  >
                    <div>
                      <p className="text-xs font-semibold tracking-tight text-ink">
                        Continue Pack Ready
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted">
                        Gemini Flash · Est. cost $0.008
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={copyPack}
                      className="group/btn relative shrink-0 cursor-pointer overflow-hidden rounded-full bg-brand px-3.5 py-1.5 text-[11px] font-semibold text-[#0e1416] transition-transform duration-200 hover:scale-[1.03] active:scale-95"
                    >
                      <span
                        className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover/btn:translate-x-full"
                        aria-hidden
                      />
                      <span className="relative inline-flex items-center gap-1.5">
                        <Copy className="h-3 w-3" />
                        {copied ? "Copied ✓" : "Copy Continue Pack"}
                      </span>
                    </button>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
