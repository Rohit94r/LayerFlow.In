"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { animate, motion } from "framer-motion";
import { ArrowDown, Clock, DollarSign, Lock } from "@/components/ui/icons";

const EASE = [0.16, 1, 0.3, 1] as const;

function Counter({ to, decimals = 0 }: { to: number; decimals?: number }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const controls = animate(0, to, {
      duration: 1.2,
      ease: EASE,
      onUpdate: (v) => setValue(v),
    });
    return () => controls.stop();
  }, [to]);

  return (
    <span className="font-mono tabular-nums text-brand">
      {value.toFixed(decimals)}
    </span>
  );
}

const STORIES = [
  {
    title: "You explain the same project again.",
    text: "Every new AI starts from zero.",
    illustration: "empty",
  },
  {
    title: "You hit a limit.",
    text: "The best answer always gets interrupted.",
    illustration: "limit",
  },
  {
    title: "Important decisions disappear.",
    text: "Your reasoning lives in old chats.",
    illustration: "timeline",
  },
  {
    title: "You pay twice.",
    text: "Most of your bill is repeated context.",
    illustration: "cost",
  },
];

function EmptyIllustration() {
  const models = ["ChatGPT", "Claude", "Gemini"];
  return (
    <div className="rounded-2xl border border-border/60 bg-white/[0.02] p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-faint">
        Each starts empty
      </p>
      <div className="mt-4 space-y-3">
        {models.map((m, i) => (
          <motion.div
            key={m}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: i * 0.15, ease: EASE }}
            className="flex items-center gap-3"
          >
            <span className="w-16 font-mono text-xs text-muted">{m}</span>
            <span className="flex-1 border-b border-dashed border-white/15" />
            <span className="h-1.5 w-1.5 rounded-full bg-white/10" />
            <span className="h-1.5 w-1.5 rounded-full bg-white/10" />
            <span className="h-1.5 w-1.5 rounded-full bg-white/10" />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function LimitIllustration() {
  return (
    <div className="rounded-2xl border border-border/60 bg-white/[0.02] p-5">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-faint">
          <Lock className="h-3.5 w-3.5" />
          Limit reached
        </p>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ delay: 1.4, duration: 0.4 }}
          className="font-mono text-xs text-brand"
        >
          100%
        </motion.p>
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-brand/60 to-brand"
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 1.4, delay: 0.3, ease: "easeOut" }}
          style={{ transformOrigin: "left" }}
        />
      </div>
      <div className="mt-4 flex items-center justify-between">
        <p className="flex items-center gap-1.5 font-mono text-xs text-muted">
          <Clock className="h-3.5 w-3.5" />
          11:43 PM
        </p>
        <p className="text-xs text-faint">conversation locked</p>
      </div>
    </div>
  );
}

function TimelineIllustration() {
  const weeks = [
    { label: "Week 1", state: "ok" as const },
    { label: "Week 2", state: "ok" as const },
    { label: "Week 3", state: "lost" as const },
  ];
  return (
    <div className="rounded-2xl border border-border/60 bg-white/[0.02] p-5">
      <div className="relative">
        <motion.div
          className="absolute left-[8%] right-[8%] top-[6px] h-px bg-white/10"
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.9, delay: 0.3, ease: EASE }}
          style={{ transformOrigin: "left" }}
        />
        <div className="flex items-start justify-between">
          {weeks.map((w, i) => (
            <motion.div
              key={w.label}
              className="flex flex-col items-center gap-3"
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: 0.4 + i * 0.25, ease: EASE }}
            >
              <span
                className={
                  w.state === "ok"
                    ? "h-[13px] w-[13px] rounded-full bg-white/60"
                    : "flex h-[13px] w-[13px] items-center justify-center rounded-full border border-dashed border-brand/60 font-mono text-[9px] leading-none text-brand"
                }
              >
                {w.state === "lost" ? "?" : ""}
              </span>
              <span className="font-mono text-[11px] text-muted">{w.label}</span>
            </motion.div>
          ))}
        </div>
      </div>
      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5, delay: 1.2 }}
        className="mt-4 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-brand/70"
      >
        Decision lost
      </motion.p>
    </div>
  );
}

function CostIllustration() {
  const models = ["GPT", "Claude", "Gemini"];
  return (
    <div className="rounded-2xl border border-border/60 bg-white/[0.02] p-5">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-faint">
          <DollarSign className="h-3.5 w-3.5" />
          Same tokens, paid again
        </p>
        <p className="font-mono text-sm">
          $<Counter to={12.4} decimals={2} />
        </p>
      </div>
      <div className="mt-4 space-y-3">
        {models.map((m, i) => (
          <motion.div
            key={m}
            className="flex items-center gap-3"
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: i * 0.15, ease: EASE }}
          >
            <span className="w-10 font-mono text-xs text-muted">{m}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
              <motion.div
                className="h-full rounded-full bg-white/25"
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.8, delay: 0.4 + i * 0.15, ease: EASE }}
                style={{ transformOrigin: "left" }}
              />
            </div>
            <span className="font-mono text-[11px] text-faint">
              {i === 0 ? "8,240" : i === 1 ? "7,900" : "7,440"} tokens
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

const ILLUSTRATIONS = [EmptyIllustration, LimitIllustration, TimelineIllustration, CostIllustration];

export default function Problem() {
  return (
    <section id="problem" className="relative overflow-hidden py-24 sm:py-32">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brand/[0.02] to-transparent" aria-hidden />
      <div className="relative mx-auto max-w-[1200px] px-5 sm:px-8">
        <div className="relative mx-auto max-w-3xl text-center">
          <div
            className="pointer-events-none absolute -top-44 left-1/2 h-[400px] w-[760px] -translate-x-1/2 rounded-full bg-brand/[0.05] blur-[130px]"
            aria-hidden
          />
        
          <h2 className="relative mt-5 text-4xl font-semibold leading-[1.06] tracking-tight text-ink sm:text-5xl lg:text-[64px]">
            AI is powerful.
            <br />
            Your <span className="text-brand">workflow</span>{" "}isn&apos;t.
          </h2>
          <p className="relative mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted">
            Every time you switch models, you lose context, repeat yourself, and
            pay again.
          </p>
        </div>

        <div className="relative mx-auto mt-20 max-w-[1000px]">
          {STORIES.map((story, i) => {
            const Illustration = ILLUSTRATIONS[i];
            const flip = i % 2 === 1;
            return (
              <div key={story.title}>
                <motion.div
                  className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.7, ease: EASE }}
                >
                  <div className={flip ? "lg:order-2" : ""}>
                    <p className="font-mono text-sm font-semibold text-brand">
                      {String(i + 1).padStart(2, "0")}
                    </p>
                    <h3 className="mt-4 max-w-md text-[24px] leading-[1.35] tracking-tight text-ink lg:text-[32px]">
                      {story.title}
                    </h3>
                    <p className="mt-4 max-w-md text-[17px] leading-relaxed text-muted">
                      {story.text}
                    </p>
                  </div>
                  <div className={flip ? "lg:order-1" : ""}>
                    <Illustration />
                  </div>
                </motion.div>

                {i < STORIES.length - 1 && (
                  <div className="flex justify-center py-12">
                    <ArrowDown className="h-4 w-4 text-brand/40" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="relative mt-24 text-center">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, ease: EASE }}
            className="mx-auto max-w-xl text-2xl font-semibold tracking-tight text-ink"
          >
            LayerFlow fixes every one of these.
          </motion.p>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-8 flex flex-col items-center gap-2"
          >
            <ArrowDown className="h-4 w-4 text-brand/50" />
            <Link
              href="#how-it-works"
              className="group inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-ink"
            >
              Continue to the solution
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
