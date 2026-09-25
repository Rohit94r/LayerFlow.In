import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, ChevronLeft } from "@/components/ui/icons";
import { Reveal } from "@/components/ui/reveal";
import { ModelPriceTable } from "@/components/marketing/model-price-table";
import {
  PRICE_ROWS,
  PROVIDER_ROWS,
  classForRow,
  formatUsd,
  roundTripUSD,
  sortByInputCost,
} from "@/lib/data/model-comparison";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Model price comparison — cheapest GPT, Claude & Gemini alternatives per task",
  description:
    "Compare AI model prices across cheap, balanced and flagship tiers. Cheapest input — OpenAI GPT-oss, DeepSeek, Gemini Flash, Claude Haiku, Groq Llama; cheapest flagship — DeepSeek R1, Kimi K2, Grok 3.",
  alternates: { canonical: "/pricing/models/compare" },
  openGraph: { url: "/pricing/models/compare" },
};

const CLASS_TITLES = {
  cheap: "Everyday & high-volume",
  balanced: "Balanced coding + analysis",
  flagship: "Hard reasoning & writing",
} as const;

const CLASS_ORDER: Array<keyof typeof CLASS_TITLES> = ["cheap", "balanced", "flagship"];

export default function ComparePage() {
  const cheapestPerClass = CLASS_ORDER.map((cls) => {
    const candidates = PRICE_ROWS.filter((r) => classForRow(r) === cls);
    const sorted = [...candidates].sort((a, b) => a.inputUSD - b.inputUSD);
    return { cls, winner: sorted[0] };
  }).filter((x) => x.winner);

  const wins = cheapestPerClass.map(({ cls, winner }) => ({
    cls,
    winner,
    roundTrip: roundTripUSD(winner),
  }));

  return (
    <div className="mx-auto max-w-7xl px-5 pb-20 pt-28 sm:px-8 sm:pt-32">
      <Reveal>
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm text-faint">
            <Link href="/pricing/models" className="inline-flex items-center gap-1 text-brand hover:underline">
              <ChevronLeft className="h-3.5 w-3.5" /> All model prices
            </Link>
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
            The cheapest model for{" "}
            <span className="text-brand">every kind of task</span>
          </h1>
          <p className="mt-4 text-lg text-muted">
            Price alone doesn&apos;t pick a model. Compare the cheapest GPT, Claude, Gemini and
            DeepSeek routes per tier — then pick by context, tools and speed.
          </p>
        </div>
      </Reveal>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {wins.map(({ cls, winner, roundTrip }, i) => (
          <Reveal key={cls} delay={i * 0.07}>
            <div className="card flex h-full flex-col p-6">
              <span className="text-xs font-semibold uppercase tracking-wide text-faint">
                {CLASS_TITLES[cls]}
              </span>
              <div className="mt-3 flex items-center gap-2.5">
                <span
                  className={cn(
                    "inline-flex h-2.5 w-2.5 rounded-full",
                    cls === "cheap" ? "bg-emerald-500" : cls === "balanced" ? "bg-amber-500" : "bg-rose-500",
                  )}
                />
                <span className="text-lg font-bold text-ink">{winner.displayName}</span>
              </div>
              <p className="mt-1 font-mono text-xs text-faint">{winner.id}</p>
              <div className="mt-4 space-y-1.5 text-sm text-muted">
                <p>
                  <span className="font-semibold text-ink">{formatUsd(winner.inputUSD)}</span> / 1M in
                </p>
                <p>
                  <span className="font-semibold text-ink">{formatUsd(winner.outputUSD)}</span> / 1M out
                </p>
                <p>~{formatUsd(roundTrip)} per 1M in + 1M out round trip</p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>

      {CLASS_ORDER.map((cls) => {
        const rows = sortByInputCost(PRICE_ROWS.filter((r) => classForRow(r) === cls));
        return (
          <Reveal key={cls}>
            <div className="mt-12">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xl font-semibold text-ink">
                  <span
                    className={cn(
                      "mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle",
                      cls === "cheap" ? "bg-emerald-500" : cls === "balanced" ? "bg-amber-500" : "bg-rose-500",
                    )}
                  />
                  {CLASS_TITLES[cls]}
                </h2>
                <p className="text-sm text-muted">cheapest-first</p>
              </div>
              <ModelPriceTable rows={rows} markCheapest />
            </div>
          </Reveal>
        );
      })}

      <Reveal delay={0.1}>
        <div className="mt-14">
          <h2 className="text-xl font-semibold text-ink">Cheapest by provider</h2>
          <p className="mt-1 text-sm text-muted">
            The most affordable entry model from each provider, in case you already standardize on one.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PROVIDER_ROWS.map((p) => {
              const cheapest = sortByInputCost(p.models)[0];
              return (
                <Link key={p.provider} href={`/pricing/models/${p.provider}`}>
                  <div className="card flex h-full items-center justify-between p-5 transition-colors hover:bg-surface-2">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                        <span className={cn("h-2.5 w-2.5 rounded-full", p.color)} />
                        {p.label}
                      </div>
                      <p className="mt-1 text-muted">
                        {cheapest?.displayName} · {cheapest ? formatUsd(cheapest.inputUSD) : "—"}/1M
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-faint" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.12}>
        <div className="mt-12 rounded-2xl bg-brand/5 p-6 text-sm leading-relaxed text-muted">
          <h2 className="mb-2 font-semibold text-ink">Which model should I pick?</h2>
          <ul className="list-inside list-disc space-y-1">
            <li>
              <strong className="text-ink">High-volume, simple tasks</strong> — reach for the
              cheapest tier: DeepSeek V3.2, Gemini Flash, GPT-4.1 mini or Groq-hosted open weights.
            </li>
            <li>
              <strong className="text-ink">Coding + analysis</strong> — Claude Sonnet 4 and GPT-4.1
              lead at a balanced price; DeepSeek R1 is the budget reasoning pick.
            </li>
            <li>
              <strong className="text-ink">Hard reasoning or long-form writing</strong> — one of the
              flagship choices; Gemini 3.1 Pro &amp; Kimi K2 Thinking win on context length.
            </li>
          </ul>
        </div>
      </Reveal>
    </div>
  );
}