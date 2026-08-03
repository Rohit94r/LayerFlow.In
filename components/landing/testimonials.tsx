"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { TESTIMONIALS } from "@/lib/data/marketing";
import type { Testimonial } from "@/lib/types";
import { ArrowRight, Star } from "@/components/ui/icons";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function Highlight({ children }: { children: string }) {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    let alive = true;
    let timeout: ReturnType<typeof setTimeout>;
    const loop = (delay: number) => {
      timeout = setTimeout(() => {
        if (!alive) return;
        setPulse(true);
        timeout = setTimeout(() => {
          if (!alive) return;
          setPulse(false);
          loop(5000 + Math.random() * 2000);
        }, 1500);
      }, delay);
    };
    loop(Math.random() * 5000);
    return () => {
      alive = false;
      clearTimeout(timeout);
    };
  }, []);

  return (
    <motion.span
      className="rounded-[4px] bg-brand/20 px-1 -mx-0.5 text-inherit transition-colors duration-300 group-hover:bg-brand/30"
      animate={pulse ? { opacity: [0.85, 1], scale: [1, 1.01] } : { opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
    >
      {children}
    </motion.span>
  );
}

function QuoteBody({ quote, highlights }: { quote: string; highlights?: string[] }) {
  const text = quote.replace(/\*/g, "");
  if (!highlights?.length) return <>{text}</>;
  const pattern = new RegExp(`(${highlights.map(escapeRegExp).join("|")})`, "g");
  const parts = text.split(pattern);
  return (
    <>
      {parts.map((part, i) =>
        highlights.includes(part) ? (
          <Highlight key={i}>{part}</Highlight>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

function Review({ t, i }: { t: Testimonial; i: number }) {
  return (
    <motion.figure
      className="group flex flex-col"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, delay: (i % 3) * 0.12, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4 }}
    >
      <div className="flex items-center gap-1" aria-label="5 out of 5 stars">
        {Array.from({ length: 5 }).map((_, s) => (
          <Star key={s} className="h-4 w-4 fill-brand text-brand" />
        ))}
      </div>
      <blockquote className="mt-6 max-w-[340px] text-[24px] leading-[1.35] tracking-tight text-ink lg:text-[32px]">
        <QuoteBody quote={t.quote} highlights={t.highlights} />
      </blockquote>
      <figcaption className="mt-8 flex items-center gap-3.5">
        <Avatar
          initials={t.initials}
          color={t.color}
          size="md"
          className="h-10 w-10 text-[11px] transition-transform duration-300 group-hover:scale-[1.04]"
        />
        <div>
          <p className="text-sm font-semibold tracking-tight text-ink">{t.name}</p>
          <p className="mt-0.5 text-xs text-muted">{t.role}</p>
        </div>
      </figcaption>
    </motion.figure>
  );
}

export default function Testimonials() {
  return (
    <section id="testimonials" className="relative overflow-hidden py-24 sm:py-32">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brand/[0.02] to-transparent" aria-hidden />

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <div className="relative mx-auto max-w-3xl text-center">
          <div
            className="pointer-events-none absolute -top-48 left-1/2 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-brand/[0.07] blur-[130px]"
            aria-hidden
          />
          
          <h2 className="relative mt-5 text-4xl font-semibold leading-[1.08] tracking-tight text-ink sm:text-5xl lg:text-6xl">
            People who stopped
            <br />
            <span className="text-brand">re-explaining</span> everything.
          </h2>
          <p className="relative mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted">
            Founders, developers, students and freelancers use LayerFlow to
            keep their AI context alive.
          </p>
        </div>

        <div className="relative mt-20 grid gap-x-12 gap-y-16 md:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <Review key={t.name} t={t} i={i} />
          ))}
        </div>

        <div className="relative mt-28 text-center">
          <p className="mx-auto max-w-xl text-2xl font-semibold tracking-tight text-ink">
            Ready to stop rebuilding context?
          </p>
          <div className="mt-8">
            <Link href="/sign-in">
              <Button size="lg" icon={<ArrowRight className="h-4 w-4" />}>
                Start Free
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
