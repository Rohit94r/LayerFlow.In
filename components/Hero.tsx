"use client";

import { motion } from "framer-motion";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { site, heroBadges } from "@/lib/content";

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
      <div className="pointer-events-none absolute inset-0 h-[860px] overflow-hidden">
        <motion.div
          className="hero-gradient"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
        <motion.div
          className="hero-aura"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5, delay: 0.2, ease: "easeOut" }}
        />
        <motion.div
          className="hero-glows"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2, delay: 0.4, ease: "easeOut" }}
        />
        <motion.div
          className="hero-stripes"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, delay: 0.1, ease: "easeOut" }}
        />
        <div className="hero-noise" />
        <div className="hero-fade" />
      </div>

      <div className="relative mx-auto max-w-[920px] px-6 pb-28 pt-[7.5rem] text-center sm:px-8">
        <motion.div variants={container} initial="hidden" animate="show">
          <motion.h1
            variants={item}
            className="hero-title mx-auto max-w-[880px] text-balance font-sans text-[2.75rem] font-light leading-[1.05] tracking-[-0.025em] text-white sm:text-[3.5rem] md:text-[4.5rem]"
          >
            Ship reliable AI in production
          </motion.h1>

          <motion.p
            variants={item}
            className="mx-auto mt-8 max-w-[680px] text-balance font-sans text-[20px] font-normal leading-[30px] text-white/70"
          >
            {site.tagline}. One integration gives you{" "}
            <span className="hero-underline">full traces</span>,{" "}
            <span className="hero-underline">real-time costs</span>, and{" "}
            <span className="hero-underline">hard budget limits</span> — before a
            surprise bill hits your inbox.
          </motion.p>

          <motion.div
            variants={item}
            className="mt-10 flex flex-wrap items-center justify-center gap-4"
          >
            <a
              href="#demo"
              className="rounded-xl bg-white px-6 py-4 text-base font-medium text-black transition-transform hover:scale-[1.02]"
            >
              View dashboard
            </a>
            <a
              href="#docs"
              className="rounded-xl border border-white/30 bg-transparent px-6 py-4 text-base font-medium text-white transition-colors hover:text-gray-300"
            >
              Start free
            </a>
          </motion.div>

          <motion.div variants={item} className="mt-12 flex flex-col items-center gap-3">
            <p className="text-sm font-normal text-white/50">
              Install the SDK — your first trace appears in under 5 minutes
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
            className="mt-8 flex flex-wrap items-center justify-center gap-3 text-[14px] font-normal text-white/60"
          >
            {heroBadges.map((b) => (
              <span
                key={b.label}
                className="pill-on-media inline-flex items-center gap-2 rounded-lg px-3 py-1.5"
              >
                {b.label}
              </span>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
