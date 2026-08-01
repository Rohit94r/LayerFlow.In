import Link from "next/link";
import { Check, ArrowRight, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { Reveal } from "@/components/ui/reveal";
import { PLANS } from "@/lib/data/marketing";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "LayerFlow pricing — Free, Starter $5/mo, Pro $14/mo. Priced on workflow value, never on unlimited AI credits. BYOK-first.",
  alternates: { canonical: "/pricing" },
  openGraph: { url: "/pricing" },
};

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-7xl px-5 pb-20 pt-28 sm:px-8 sm:pt-32">
      <Reveal>
        <div className="mx-auto max-w-2xl text-center">
          <span className="glass-pill inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-brand">
            Pricing
          </span>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
            Save the workflow,{" "}
            <span className="text-brand">not just the tokens</span>
          </h1>
          <p className="mt-4 text-lg text-muted">
            Every plan works with your own API keys. You pay for the system that
            preserves your AI context — never for resold model credits.
          </p>
        </div>
      </Reveal>

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        {PLANS.map((plan, i) => (
          <Reveal key={plan.id} delay={i * 0.08}>
            <div
              className={cn(
                "relative flex h-full flex-col rounded-2xl p-8",
                plan.highlighted ? "gradient-border" : "card",
              )}
            >
              {plan.badge ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand px-3.5 py-1 text-[11px] font-bold text-[#0e1416]">
                  {plan.badge}
                </span>
              ) : null}

              <h2 className="text-lg font-semibold text-ink">{plan.name}</h2>
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

      <Reveal delay={0.15}>
        <div className="mx-auto mt-12 max-w-3xl">
          <div className="card flex flex-col items-center gap-6 p-8 text-center sm:flex-row sm:text-left">
            <div className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-border bg-surface-2 text-brand">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-ink">What never changes</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">
                No unlimited hosted credits. No selling your chats. No lock-in.
                LayerFlow is a context system you own — bring your own keys, export
                anything, leave anytime. Cancel in one click.
              </p>
            </div>
          </div>
          <p className="mt-8 text-center text-sm text-faint">
            Need a team plan or a lifetime deal?{" "}
            <Link href="/sign-in" className="text-brand hover:underline">
              Start free
            </Link>{" "}
            and we&apos;ll talk.
          </p>
        </div>
      </Reveal>
    </div>
  );
}
