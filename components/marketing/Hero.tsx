"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import { Copy, Check } from "@/components/ui/icons";
import { useState, useEffect, useRef } from "react";
import { site, heroBadges } from "@/lib/marketing-content";
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
  const [copiedInstall, setCopiedInstall] = useState(false);
  const heroRef = useRef<HTMLElement>(null);

  const { scrollY } = useScroll();
  const bgParallax = useTransform(scrollY, [0, 800], [0, 120]);
  const stripeParallax = useTransform(scrollY, [0, 800], [0, 60]);
  const auroraParallax = useTransform(scrollY, [0, 800], [0, 30]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!heroRef.current) return;
      heroRef.current.style.setProperty("--mouse-x", `${e.clientX}px`);
      heroRef.current.style.setProperty("--mouse-y", `${e.clientY}px`);
    };
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const copyInstall = async () => {
    await navigator.clipboard.writeText(
      "curl -fsSL https://raw.githubusercontent.com/Rohit94r/layerflow-releases/main/install.sh | bash",
    );
    setCopiedInstall(true);
    setTimeout(() => setCopiedInstall(false), 1800);
  };

  return (
    <section
      id="top"
      ref={heroRef}
      className="hero-canvas relative min-h-[900px] overflow-hidden"
    >
      {/* ── BACKGROUND LAYERS ── */}
      <div className="pointer-events-none absolute inset-0 h-[1100px] overflow-hidden">
        {/* Layer 1 — Animated Gradient */}
        <motion.div
          className="hero-gradient-layer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.4, ease: "easeOut" }}
          style={{ y: bgParallax }}
        />

        {/* Layer 2 — Floating Vertical Lines */}
        <motion.div
          className="hero-stripes-layer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, delay: 0.2, ease: "easeOut" }}
          style={{ y: stripeParallax }}
        />

        {/* Layer 3 — Aurora Glow (3 circles) */}
        <motion.div
          className="hero-aurora-layer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2, delay: 0.4, ease: "easeOut" }}
          style={{ y: auroraParallax }}
        >
          <div className="aurora-orb aurora-cyan" />
          <div className="aurora-orb aurora-purple" />
          <div className="aurora-orb aurora-blue" />
        </motion.div>

        {/* Layer 4 — Mouse Cursor Glow */}
        <div className="hero-mouse-glow" />

        {/* Layer 5 — Noise */}
        <div className="hero-noise-layer" />

        {/* Layer 6 — Dark Overlay */}
        <div className="hero-fade-layer" />
      </div>

      {/* ── HERO CONTENT (never moves) ── */}
      <div className="relative mx-auto max-w-[1100px] px-6 pb-32 pt-[8rem] text-center sm:px-8 md:pt-[9rem]">
        <motion.div variants={container} initial="hidden" animate="show">
          <motion.h1
            variants={item}
            className="hero-title mx-auto max-w-[960px] text-balance font-sans text-[2.9rem] font-light leading-[1.05] tracking-[-0.025em] text-white sm:text-[3.8rem] md:text-[5rem]"
          >
            {site.headline}
          </motion.h1>

          <motion.p
            variants={item}
            className="mx-auto mt-8 max-w-[720px] text-balance font-sans text-[20px] font-normal leading-[30px] text-white/70"
          >
            {site.subtitle}
          </motion.p>

          <motion.div
            variants={item}
            className="mt-10 flex flex-wrap items-center justify-center gap-4"
          >
            <a
              href={site.signInHref}
              className="rounded-xl bg-white px-6 py-4 text-base font-medium text-black transition-transform hover:scale-[1.02]"
            >
              Start coding
            </a>
            <Link
              href="/agents"
              className="rounded-xl bg-white/10 px-6 py-4 text-base font-medium text-white ring-1 ring-white/25 transition-colors hover:bg-white/15"
            >
              Build agents
            </Link>
            <a
              href={site.pricingHref}
              className="rounded-xl border border-white/30 bg-transparent px-6 py-4 text-base font-medium text-white transition-colors hover:text-gray-300"
            >
              View pricing
            </a>
          </motion.div>

          <motion.div variants={item} className="mt-12 flex flex-col items-center gap-3">
            <p className="text-sm font-normal text-white/50">
              Install the lf CLI — sync your terminal sessions, costs and context with the web app
            </p>
            <div className="flex flex-col items-center gap-2.5 sm:flex-row sm:gap-3">
              <button
                onClick={copyInstall}
                className="pill-on-media group flex max-w-full items-center gap-3 rounded-xl px-4 py-2.5 font-mono text-[14px] font-normal text-white/90"
              >
                <span className="text-emerald-400/80">$</span>
                <span className="truncate">curl -fsSL https://raw.githubusercontent.com/Rohit94r/layerflow-releases/main/install.sh | bash</span>
                <span className="ml-1 text-white/50 transition-colors group-hover:text-white">
                  {copiedInstall ? (
                    <Check className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </span>
              </button>
            </div>
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
