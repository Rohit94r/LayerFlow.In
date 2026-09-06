"use client";

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
  return <span className="font-bold text-ink">{children}</span>;
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
      className="group flex h-full flex-col"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, delay: (i % 3) * 0.12, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex items-center gap-1" aria-label="5 out of 5 stars">
        {Array.from({ length: 5 }).map((_, s) => (
          <Star key={s} className="h-4 w-4 fill-brand text-brand" />
        ))}
      </div>
      <blockquote className="mt-4 flex-1 text-lg leading-[1.4] tracking-tight text-ink lg:text-[19px]">
        <QuoteBody quote={t.quote} highlights={t.highlights} />
      </blockquote>
      <figcaption className="mt-7 flex items-center gap-3">
        {t.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={t.photo}
            alt={t.name}
            className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-border/60 transition-transform duration-300 group-hover:scale-[1.05]"
          />
        ) : (
          <Avatar
            initials={t.initials}
            color={t.color}
            size="md"
            className="h-10 w-10 text-[11px] transition-transform duration-300 group-hover:scale-[1.05]"
          />
        )}
        <div>
          <p className="text-sm font-bold tracking-tight text-ink">{t.name}</p>
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
            keep their AI context alive — in the browser and in the terminal.
          </p>
        </div>

        <div className="relative mt-20 grid gap-x-8 gap-y-14 md:grid-cols-2 lg:grid-cols-3">
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
