"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { site } from "@/lib/data/marketing";

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/#features" },
      { label: "How it works", href: "/#how-it-works" },
      { label: "Comparison", href: "/#comparison" },
      { label: "Pricing", href: "/pricing" },
      { label: "Roadmap", href: "/#roadmap" },
    ],
  },
  {
    title: "Use cases",
    links: [
      { label: "Limit Rescue", href: "/#use-cases" },
      { label: "Cost Check", href: "/#features" },
      { label: "Improve Prompt", href: "/rescue?mode=prompt" },
      { label: "BYOK", href: "/#features" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Docs", href: "/docs" },
      { label: "Install CLI", href: "/docs#install" },
      { label: "Engineering", href: "/docs#architecture" },
      { label: "Sign in", href: "/sign-in" },
    ],
  },
];

const WORD = "LayerFlow.dev";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-surface/40">
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <p className="font-sans text-[17px] font-bold tracking-tight text-ink">
              LayerFlow
            </p>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
              {site.tagline}. Code in your browser or terminal — write plain
              English, click Improve, and run multi-agent sessions. Rescue dead
              chats into Context Passports and continue in any model.
            </p>
            <p className="mt-5 text-xs text-faint">
              © {new Date().getFullYear()} LayerFlow. Built for people who never
              want to re-explain their work to an AI again.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="text-xs font-bold uppercase tracking-widest text-faint">{col.title}</h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-sm text-muted transition-colors hover:text-ink"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 text-xs text-faint sm:flex-row">
          <span>Code with AI. Never lose context.</span>
          <span>LayerFlow © {new Date().getFullYear()}</span>
        </div>

        <div className="pointer-events-none mt-12 select-none" aria-hidden>
          <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
            {WORD.split("").map((ch, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, scale: 0, y: 24 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{
                  type: "spring",
                  stiffness: 500,
                  damping: 24,
                  delay: i * 0.045,
                }}
                className="flex h-12 w-12 items-center justify-center rounded-xl border border-brand/25 bg-surface shadow-[0_0_20px_rgba(249,115,22,0.12)] sm:h-16 sm:w-16 lg:h-20 lg:w-20"
              >
                <span className="bg-gradient-to-b from-brand to-brand/60 bg-clip-text font-black leading-none text-transparent [font-size:clamp(1.5rem,2.6vw,2.75rem)]">
                  {ch === "." ? <span className="text-2xl sm:text-3xl lg:text-4xl">.</span> : ch}
                </span>
              </motion.span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
