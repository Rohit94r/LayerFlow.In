import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "@/components/ui/icons";
import { Reveal } from "@/components/ui/reveal";
import { ModelPriceTable } from "@/components/marketing/model-price-table";
import { PRICE_ROWS, sortByInputCost } from "@/lib/data/model-comparison";

export const metadata: Metadata = {
  title: "AI model prices 2026 — GPT, Claude, Gemini, DeepSeek per 1M tokens",
  description:
    "Live AI model price comparison: GPT-4o, GPT-4.1, Claude Sonnet 4 / Opus 4, Gemini 3.1 Pro, DeepSeek, Groq Llama and more — input and output price per 1M tokens, context window, tool/vision support.",
  alternates: { canonical: "/pricing/models" },
  openGraph: { url: "/pricing/models" },
};

export default function ModelsPage() {
  const rows = sortByInputCost(PRICE_ROWS);

  return (
    <div className="mx-auto max-w-7xl px-5 pb-20 pt-28 sm:px-8 sm:pt-32">
      <Reveal>
        <div className="mx-auto max-w-3xl text-center">
          <span className="glass-pill inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-brand">
            Price comparison
          </span>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
            AI model prices,{" "}
            <span className="text-brand">side by side</span>
          </h1>
          <p className="mt-4 text-lg text-muted">
            List prices per 1&nbsp;M tokens from every major provider — OpenAI, Anthropic,
            Google, DeepSeek, Groq, xAI, Moonshot, OpenRouter and OpenCode Zen.
            Sorted cheapest first. No markup, ever.
          </p>
        </div>
      </Reveal>

      <Reveal delay={0.05}>
        <div className="mt-10">
          <ModelPriceTable rows={rows} markCheapest markBestContext />
          <p className="mt-4 text-xs text-faint">
            Prices are provider list prices in USD per 1&nbsp;M tokens, read live from the
            LayerFlow model registry (the same catalog the gateway prices against). Cached-input
            discounts and per-day pricing aren&apos;t shown. Always check the provider for the final
            rate.
          </p>
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="mt-14 flex flex-col items-center gap-4 rounded-2xl border border-border bg-surface-2/50 p-8 text-center">
          <h2 className="text-xl font-semibold text-ink">Pay the provider, not a reseller</h2>
          <p className="max-w-2xl text-sm leading-relaxed text-muted">
            LayerFlow is a <span className="font-medium text-ink">spend firewall</span>: bring your
            own keys (or use platform keys) and every request is billed at the exact list price
            above — plus hard budgets, alerts and savings routing to the cheapest model good enough
            for the job.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/pricing">
              <span className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-[#0e1416] transition-opacity hover:opacity-90">
                View pricing <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
            <Link href="/pricing/models/compare">
              <span className="inline-flex items-center gap-2 rounded-xl border border-border-strong px-5 py-3 text-sm font-semibold text-ink transition-colors hover:bg-surface-2">
                Cheapest by class
              </span>
            </Link>
          </div>
        </div>
      </Reveal>
    </div>
  );
}