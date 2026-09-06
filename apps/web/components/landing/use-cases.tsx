"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { USE_CASES } from "@/lib/data/marketing";
import { ArrowRight } from "@/components/ui/icons";

export default function UseCases() {
  return (
    <section id="use-cases" className="relative overflow-hidden py-24 sm:py-32">
      <div
        className="absolute inset-0 bg-gradient-to-b from-transparent via-brand/[0.02] to-transparent"
        aria-hidden
      />
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <div className="relative mx-auto max-w-3xl text-center">
          <div
            className="pointer-events-none absolute -top-44 left-1/2 h-[400px] w-[760px] -translate-x-1/2 rounded-full bg-brand/[0.05] blur-[130px]"
            aria-hidden
          />
         
          <h2 className="relative mt-5 text-4xl font-semibold leading-[1.06] tracking-tight text-ink sm:text-5xl lg:text-[64px]">
            Made for people who
            <br />
            <span className="text-brand">live in AI tools.</span>
          </h2>
          <p className="relative mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted">
            Whether you&apos;re a founder, developer, student or freelancer,
            LayerFlow adapts to your workflow instead of forcing you into
            another chat app.
          </p>
        </div>

        <div className="relative mt-20 grid gap-x-12 gap-y-16 md:grid-cols-2 lg:grid-cols-3">
          {USE_CASES.map((uc, i) => (
            <motion.div
              key={uc.title}
              className="group flex cursor-pointer flex-col"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.7, delay: (i % 3) * 0.12, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -4 }}
            >
              <p className="font-mono text-sm font-medium text-faint transition-colors duration-300 group-hover:text-brand">
                {String(i + 1).padStart(2, "0")}
              </p>
              <h3 className="mt-4 max-w-[340px] text-[24px] font-semibold leading-[1.3] tracking-tight text-ink transition-colors duration-300 group-hover:text-brand lg:text-[28px]">
                {uc.title}
              </h3>
              <p className="mt-3 max-w-[340px] text-[17px] leading-relaxed text-muted">
                {uc.description}
              </p>
            </motion.div>
          ))}
        </div>

        <div className="relative mt-24 text-center">
          <p className="mx-auto max-w-xl text-2xl font-semibold tracking-tight text-ink">
            Ready to stop rebuilding context?
          </p>
          <Link
            href="/sign-in"
            className="group mt-7 inline-flex items-center gap-2 text-lg font-semibold text-ink"
          >
            Start free
            <ArrowRight className="h-5 w-5 text-brand transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}
