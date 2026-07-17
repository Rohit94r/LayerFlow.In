import { ArrowRight } from "lucide-react";
import { pricingTiers, site } from "@/lib/marketing-content";
import Reveal from "@/components/marketing/Reveal";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "LayerFlow pricing — free personal workspace, Pro for power users, Team when you're ready to share.",
};

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 pb-24 pt-32 sm:px-8">
      <Reveal>
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-brand">Pricing</p>
          <h1 className="mt-3 font-sans text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
            Simple plans for your AI workspace
          </h1>
          <p className="mt-4 text-lg text-muted">
            Start free. Upgrade when you need more runs, history, or team
            features. No infrastructure markup — BYOK keeps billing with you.
          </p>
        </div>
      </Reveal>

      <div className="mt-16 grid gap-6 lg:grid-cols-3">
        {pricingTiers.map((tier, i) => (
          <Reveal key={tier.name} delay={i * 0.06}>
            <div
              className={`card flex h-full flex-col p-8 ${
                tier.highlighted
                  ? "ring-2 ring-brand/50 shadow-lg shadow-brand/5"
                  : "card-hover"
              }`}
            >
              {tier.highlighted && (
                <span className="mb-4 inline-flex w-fit rounded-full bg-brand/15 px-3 py-1 text-xs font-medium text-brand">
                  Most popular
                </span>
              )}
              <h2 className="text-xl font-semibold text-ink">{tier.name}</h2>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-semibold text-ink">
                  {tier.price}
                </span>
                <span className="text-muted">{tier.period}</span>
              </div>
              <p className="mt-3 text-sm text-muted">{tier.description}</p>
              <ul className="mt-8 flex-1 space-y-3">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-ink/90">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href={tier.href}
                className={`mt-8 inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-transform hover:scale-[1.02] ${
                  tier.highlighted
                    ? "bg-white text-black"
                    : "border border-border-strong text-ink hover:bg-surface-2"
                }`}
              >
                {tier.cta}
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal delay={0.15}>
        <p className="mt-16 text-center text-sm text-muted">
          Enterprise plans available when companies ask.{" "}
          <a href="/about" className="text-brand hover:underline">
            Get in touch
          </a>
          .
        </p>
      </Reveal>
    </div>
  );
}
