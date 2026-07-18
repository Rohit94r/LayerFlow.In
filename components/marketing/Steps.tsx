"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { steps, site } from "@/lib/marketing-content";
import TypingCodeWindow from "./TypingCodeWindow";
import Reveal from "./Reveal";

export default function Steps() {
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.25 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const onStepComplete = useCallback((index: number) => {
    if (index < steps.length - 1) {
      setTimeout(() => setActiveStep(index + 1), 400);
    }
  }, []);

  return (
    <section
      ref={sectionRef}
      id="docs"
      className="mx-auto max-w-7xl scroll-mt-24 px-5 py-20 sm:px-8 sm:py-28"
    >
      <Reveal>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold text-ink sm:text-4xl">
            Your workspace in minutes
          </h2>
          <p className="mt-4 text-muted">
            Create a project, write your first prompt, and compare across
            models — outputs and costs appear instantly.
          </p>
          <a
            href={site.signInHref}
            className="group mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-brand"
          >
            Sign in to start
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </a>
        </div>
      </Reveal>

      <div className="mt-14 grid gap-8 lg:grid-cols-3 lg:gap-6">
        {steps.map((s, i) => {
          const isActive = visible && activeStep === i;
          const isDone = visible && activeStep > i;
          const isWaiting = visible && activeStep < i;

          return (
            <Reveal key={s.n} delay={i * 0.08}>
              <motion.div
                animate={{
                  opacity: isWaiting ? 0.55 : 1,
                  scale: isActive ? 1.02 : 1,
                }}
                transition={{ duration: 0.35 }}
                className={`card flex h-full flex-col p-6 sm:p-7 ${
                  isActive
                    ? "ring-2 ring-brand/40 shadow-lg shadow-brand/5"
                    : "card-hover"
                }`}
              >
                <div className="mb-5 flex items-center gap-4">
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-semibold text-white transition-colors ${
                      isDone || isActive
                        ? "bg-gradient-to-br from-brand to-brand-2"
                        : "bg-surface-2 text-muted"
                    }`}
                  >
                    {s.n}
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold text-ink sm:text-xl">
                      {s.title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted sm:text-[15px]">
                      {s.desc}
                    </p>
                  </div>
                </div>

                <div className="mt-auto">
                  <TypingCodeWindow
                    lang={s.lang}
                    lines={s.code}
                    playing={isActive}
                    done={isDone}
                    onComplete={() => onStepComplete(i)}
                  />
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-faint">
                    <Clock className="h-3.5 w-3.5" />
                    {s.time}
                  </div>
                </div>
              </motion.div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
