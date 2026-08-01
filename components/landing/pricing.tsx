import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { SectionHeading, Reveal } from "@/components/ui/reveal";
import { PLANS } from "@/lib/data/marketing";
import { cn } from "@/lib/utils";

export default function Pricing() {
  return (
    <section id="pricing" className="relative py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <SectionHeading
          eyebrow="Pricing"
          title={
            <>
              Priced for the{" "}
              <span className="text-brand">workflow</span>, not the tokens
            </>
          }
          description="No unlimited-credit gimmicks. LayerFlow charges for the system that saves your context — you pay providers directly with BYOK."
        />

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {PLANS.map((plan, i) => (
            <Reveal key={plan.id} delay={i * 0.08}>
              <div
                className={cn(
                  "relative flex h-full flex-col rounded-2xl p-8",
                  plan.highlighted
                    ? "gradient-border shadow-[0_30px_80px_-30px_var(--glow-amber)]"
                    : "card",
                )}
              >
                {plan.badge ? (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand px-3.5 py-1 text-[11px] font-bold text-[#0e1416]">
                    {plan.badge}
                  </span>
                ) : null}

                <h3 className="text-lg font-semibold text-ink">{plan.name}</h3>
                <p className="mt-1 text-sm text-muted">{plan.description}</p>

                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-5xl font-bold tracking-tight text-ink">{plan.price}</span>
                  <span className="text-sm text-muted">{plan.period}</span>
                </div>

                <ul className="mt-8 flex-1 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-ink/90">
                      <span className="mt-0.5 inline-flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-brand/15">
                        <Check className="h-3 w-3 text-brand" strokeWidth={3} />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>

                <Link href={plan.href} className="mt-8">
                  <button
                    type="button"
                    className={cn(
                      "inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-all",
                      plan.highlighted
                        ? "bg-brand text-[#0e1416] hover:opacity-90"
                        : "border border-border-strong text-ink hover:bg-surface-2",
                    )}
                  >
                    {plan.cta}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </Link>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.2}>
          <p className="mx-auto mt-10 max-w-xl text-center text-sm leading-relaxed text-faint">
            Every plan includes privacy-first defaults: your raw chats are never
            sold, never fed into training data, and only stored when you save.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
