"use client";

import { motion } from "framer-motion";

const TOOLS = [
  "ChatGPT",
  "Claude",
  "Gemini",
  "DeepSeek",
  "Kimi",
  "Groq",
  "OpenRouter",
  "Perplexity",
];

const ORANGE = "#f97316";
const DIM = "rgba(255, 255, 255, 0.55)";

export default function LogosStrip() {
  return (
    <section className="border-y border-border bg-surface/40 py-12">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <p className="text-center text-sm font-medium tracking-wide text-muted">
          Code, run and rescue with every major AI — web or terminal
        </p>

        <div className="relative mt-8 overflow-hidden py-2" aria-hidden>
          <div className="animate-marquee flex w-max items-center gap-14 pr-14">
            {[...TOOLS, ...TOOLS].map((tool, i) => (
              <motion.span
                key={`${tool}-${i}`}
                className="whitespace-nowrap text-3xl font-bold tracking-tight sm:text-4xl"
                initial={false}
                animate={{
                  fontWeight: [300, 800, 300],
                  color: [DIM, ORANGE, DIM],
                  opacity: [0.55, 1, 0.55],
                }}
                transition={{
                  duration: 3.2,
                  repeat: Infinity,
                  repeatType: "loop",
                  delay: (i % TOOLS.length) * 0.4,
                  ease: "easeInOut",
                }}
              >
                {tool}
              </motion.span>
            ))}
          </div>
          <div className="pointer-events-none absolute inset-y-0 left-0 w-28 bg-gradient-to-r from-bg to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-28 bg-gradient-to-l from-bg to-transparent" />
        </div>
      </div>
    </section>
  );
}
