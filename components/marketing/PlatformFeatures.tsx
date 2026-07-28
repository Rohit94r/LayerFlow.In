"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { features } from "@/lib/marketing-content";
import CodeWindow from "./CodeWindow";

const AUTO_MS = 1000;

export default function PlatformFeatures() {
  const [active, setActive] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [userScrolling, setUserScrolling] = useState(false);
  const leftRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToIndex = useCallback((index: number, behavior: ScrollBehavior = "smooth") => {
    const el = itemRefs.current[index];
    if (el && leftRef.current) {
      const top = el.offsetTop - leftRef.current.offsetTop;
      leftRef.current.scrollTo({ top, behavior });
    }
    setActive(index);
  }, []);

  /* detect which feature is in view while user scrolls the left panel */
  useEffect(() => {
    const root = leftRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) {
          const idx = Number(visible[0].target.getAttribute("data-index"));
          if (!Number.isNaN(idx)) setActive(idx);
        }
      },
      { root, threshold: [0.45, 0.6, 0.75] },
    );

    itemRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  /* pause auto-advance while user scrolls manually */
  const onLeftScroll = () => {
    setUserScrolling(true);
    if (scrollTimer.current) clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(() => setUserScrolling(false), 1800);
  };

  /* auto-advance every 1s unless hovering or user is scrolling */
  useEffect(() => {
    if (hovering || userScrolling) return;
    const id = setInterval(() => {
      setActive((prev) => {
        const next = (prev + 1) % features.length;
        scrollToIndex(next);
        return next;
      });
    }, AUTO_MS);
    return () => clearInterval(id);
  }, [hovering, userScrolling, scrollToIndex]);

  const current = features[active];

  return (
    <section id="features" className="scroll-mt-24 border-t border-border">
      <div className="mx-auto max-w-7xl px-6 py-20 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-normal text-brand">Prompt Workspace</p>
          <h2 className="mt-3 font-sans text-[2rem] font-semibold leading-tight text-ink sm:text-[2.5rem]">
            Everything you do with AI, in one place
          </h2>
          <p className="mt-4 text-[20px] font-normal leading-[28px] text-muted">
            Timeline, Compare, budgets, domains, and BYOK — the workspace
            developers and power users actually need.
          </p>
        </div>

        <div className="mt-14 grid gap-10 lg:grid-cols-2 lg:gap-16">
          {/* LEFT — scrollable feature list */}
          <div
            ref={leftRef}
            onScroll={onLeftScroll}
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
            className="relative max-h-[72vh] overflow-y-auto pr-2 [scrollbar-width:thin] lg:max-h-[640px]"
          >
            {features.map((f, i) => {
              const isActive = i === active;
              return (
                <div
                  key={f.id}
                  id={f.id}
                  ref={(el) => {
                    itemRefs.current[i] = el;
                  }}
                  data-index={i}
                  onClick={() => scrollToIndex(i)}
                  className={`cursor-pointer border-b border-border py-10 transition-opacity duration-300 first:pt-0 last:border-b-0 ${
                    isActive ? "opacity-100" : "opacity-35 hover:opacity-60"
                  }`}
                >
                  <p className="text-sm font-normal text-brand">{f.eyebrow}</p>
                  <h3 className="mt-2 font-sans text-[1.5rem] font-semibold leading-tight text-ink sm:text-[1.75rem]">
                    {f.title}
                  </h3>
                  <p className="mt-3 text-[18px] font-normal leading-[26px] text-muted">
                    {f.body}
                  </p>
                  {isActive && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      transition={{ duration: 0.25 }}
                    >
                      <ul className="mt-5 space-y-2.5">
                        {f.bullets.map((b) => (
                          <li
                            key={b}
                            className="flex items-start gap-2.5 text-[15px] text-ink/90"
                          >
                            <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-brand/15 text-brand">
                              <Check className="h-3 w-3" />
                            </span>
                            {b}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-6 flex flex-wrap gap-3">
                        {f.cta.map((c, ci) => (
                          <a
                            key={c.label}
                            href={c.href}
                            onClick={(e) => e.stopPropagation()}
                            className={`group inline-flex items-center gap-1.5 text-sm font-normal ${
                              ci === 0
                                ? "text-brand hover:underline"
                                : "text-muted hover:text-ink"
                            }`}
                          >
                            {c.label}
                            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                          </a>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>

          {/* RIGHT — sticky code panel */}
          <div className="hidden lg:block">
            <div className="sticky top-28">
              <AnimatePresence mode="wait">
                <motion.div
                  key={current.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.28 }}
                >
                  <CodeWindow
                    lang={current.code.lang}
                    lines={current.code.lines}
                    filename={`${current.id}.${
                      current.code.lang === "bash"
                        ? "sh"
                        : current.code.lang === "text"
                          ? "txt"
                          : "ts"
                    }`}
                  />
                </motion.div>
              </AnimatePresence>
              <p className="mt-4 text-center text-xs text-faint">
                {active + 1} / {features.length} — hover left panel to pause auto-scroll
              </p>
            </div>
          </div>
        </div>

        {/* mobile code below active item */}
        <div className="mt-8 lg:hidden">
          <CodeWindow
            lang={current.code.lang}
            lines={current.code.lines}
            filename={`${current.id}.${
              current.code.lang === "bash"
                ? "sh"
                : current.code.lang === "text"
                  ? "txt"
                  : "ts"
            }`}
          />
        </div>
      </div>
    </section>
  );
}
