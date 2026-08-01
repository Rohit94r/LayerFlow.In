"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

const TOOLS = ["ChatGPT", "Claude", "Gemini", "DeepSeek", "Kimi", "Groq"];

export default function CtaSection() {
  return (
    <section className="relative py-16 sm:py-20">
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <motion.div
          className="gradient-border relative overflow-hidden rounded-3xl p-8 text-center sm:p-12"
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
        >
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(60% 55% at 50% 0%, rgba(249, 115, 22, 0.09) 0%, transparent 70%)",
            }}
            aria-hidden
          />
          <div className="relative">
            <p className="text-sm font-medium tracking-wide text-white/60">
              {TOOLS.join(" · ")}
            </p>
            <h2 className="mx-auto mt-6 max-w-2xl text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
              Your next AI conversation{" "}
              <span className="text-brand">starts with everything you already know</span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg text-muted">
              Paste a chat, get your Context Passport, and never rebuild context from zero again.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/rescue">
                <Button size="lg" icon={<ArrowRight className="h-4 w-4" />}>
                  Rescue My Chat — it&apos;s free
                </Button>
              </Link>
              <Link href="/rescue?mode=prompt">
                <Button size="lg" variant="secondary">
                  Improve A Prompt
                </Button>
              </Link>
            </div>
            <p className="mt-8 inline-flex items-center gap-2 text-xs text-faint">
              <ShieldCheck className="h-4 w-4 text-brand" />
              Private by default · BYOK · No unlimited-credit traps
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
