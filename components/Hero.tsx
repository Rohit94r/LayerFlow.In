"use client";

import { motion } from "framer-motion";
import { Copy, Check, Github, Download } from "lucide-react";
import { useState } from "react";
import { site } from "@/lib/content";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.04 } },
};
const item = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.21, 0.5, 0.32, 1] },
  },
};

export default function Hero() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(site.docsCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <section id="top" className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 h-[860px]">
        <div className="hero-gradient" />
        <div className="hero-rays" />
        <div className="hero-noise" />
        <div className="hero-fade" />
      </div>

      <div className="relative mx-auto max-w-[920px] px-6 pb-28 pt-[7.5rem] text-center sm:px-8">
        <motion.div variants={container} initial="hidden" animate="show">
          <motion.h1
            variants={item}
            className="mx-auto max-w-[880px] text-balance font-sans text-[2.75rem] font-semibold leading-[1.08] tracking-[-0.03em] text-white sm:text-[3.5rem] md:text-[4.25rem]"
          >
            Deliver High-Quality AI, Fast
          </motion.h1>

          <motion.p
            variants={item}
            className="mx-auto mt-6 max-w-[720px] text-balance font-sans text-[20px] font-normal leading-[28px] text-white/70"
          >
            Building AI products is all about iteration.
            <br />
            LayerFlow lets you move 10x faster by simplifying how you{" "}
            <span className="hero-underline">debug</span>,{" "}
            <span className="hero-underline">evaluate</span>, and{" "}
            <span className="hero-underline">monitor</span> your LLM
            applications, Agents, and Models.
          </motion.p>

          <motion.div
            variants={item}
            className="mt-10 flex flex-wrap items-center justify-center gap-3"
          >
            <a
              href="#demo"
              className="rounded-full bg-white px-7 py-3 text-[15px] font-medium text-black transition-transform hover:scale-[1.02]"
            >
              Try Demo
            </a>
            <a
              href="#docs"
              className="rounded-full border border-white/35 px-7 py-3 text-[15px] font-normal text-white transition-colors hover:bg-white/10"
            >
              Get Started
            </a>
          </motion.div>

          <motion.div variants={item} className="mt-10 flex flex-col items-center gap-3">
            <p className="text-sm font-normal text-white/60">
              ✨ New: let your coding agent set up LayerFlow tracing for you
            </p>
            <button
              onClick={copy}
              className="pill-on-media group flex max-w-full items-center gap-3 rounded-xl px-4 py-2.5 font-mono text-[14px] font-normal text-white/90"
            >
              <span className="text-white/40">$</span>
              <span className="truncate">{site.docsCommand}</span>
              <span className="ml-1 text-white/50 transition-colors group-hover:text-white">
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-400" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </span>
            </button>
          </motion.div>

          <motion.div
            variants={item}
            className="mt-10 flex flex-wrap items-center justify-center gap-3 text-[14px] font-normal text-white/80"
          >
            <span className="pill-on-media inline-flex items-center gap-2 rounded-lg px-3 py-1.5">
              <Github className="h-4 w-4" /> {site.githubStars}+ Stars
            </span>
            <span className="pill-on-media inline-flex items-center gap-2 rounded-lg px-3 py-1.5">
              <Download className="h-4 w-4" /> {site.monthlyRequests} Requests/mo
            </span>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
