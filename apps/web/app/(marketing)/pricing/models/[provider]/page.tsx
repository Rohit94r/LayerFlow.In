import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight, ChevronLeft } from "@/components/ui/icons";
import { Reveal } from "@/components/ui/reveal";
import { ModelPriceTable } from "@/components/marketing/model-price-table";
import {
  PROVIDER_ROWS,
  PROVIDER_LABEL,
  sortByInputCost,
  type PriceRow,
} from "@/lib/data/model-comparison";
import { cn } from "@/lib/utils";

interface PageProps {
  params: Promise<{ provider: string }>;
}

export function generateStaticParams() {
  return PROVIDER_ROWS.map((p) => ({ provider: p.provider }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { provider } = await params;
  const match = PROVIDER_ROWS.find((p) => p.provider === provider);
  if (!match) return {};
  const rows = sortByInputCost(match.models);
  const names = rows.map((r) => r.displayName).join(", ");
  const cheapest = rows[0];
  return {
    title: `${PROVIDER_LABEL[provider as keyof typeof PROVIDER_LABEL]} model prices — ${cheapest.displayName} from $${cheapest.inputUSD.toFixed(2)}/1M tokens`,
    description: `${PROVIDER_LABEL[provider as keyof typeof PROVIDER_LABEL]} pricing per 1M tokens: ${names}. Input, output and round-trip costs, context windows and capabilities compared against every other provider.`,
    alternates: { canonical: `/pricing/models/${provider}` },
    openGraph: { url: `/pricing/models/${provider}` },
  };
}

export default async function ProviderModelsPage({ params }: PageProps) {
  const { provider } = await params;
  const match = PROVIDER_ROWS.find((p) => p.provider === provider);
  if (!match) notFound();

  const rows: PriceRow[] = sortByInputCost(match.models);
  const others = PROVIDER_ROWS.filter((p) => p.provider !== provider);

  return (
    <div className="mx-auto max-w-7xl px-5 pb-20 pt-28 sm:px-8 sm:pt-32">
      <Reveal>
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm text-faint">
            <Link href="/pricing/models" className="inline-flex items-center gap-1 text-brand hover:underline">
              <ChevronLeft className="h-3.5 w-3.5" /> All model prices
            </Link>
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <span className={cn("h-3 w-3 rounded-full", match.color)} />
            <span className="text-sm font-semibold uppercase tracking-wide text-brand">
              {match.label}
            </span>
          </div>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
            {match.label} model prices
          </h1>
          <p className="mt-4 text-lg text-muted">
            List prices per 1&nbsp;M tokens for {match.label}, sorted cheapest first.
            LayerFlow routes any of these models through one OpenAI-compatible gateway with
            budgets, alerts and savings.
          </p>
        </div>
      </Reveal>

      <Reveal delay={0.05}>
        <div className="mt-10">
          <ModelPriceTable rows={rows} markCheapest />
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="mt-14">
          <h2 className="text-xl font-semibold text-ink">Compare with other providers</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {others.map((p) => {
              const cheapest = sortByInputCost(p.models)[0];
              return (
                <Link key={p.provider} href={`/pricing/models/${p.provider}`}>
                  <div className="card flex h-full items-center justify-between gap-2 p-5 transition-colors hover:bg-surface-2">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                        <span className={cn("h-2.5 w-2.5 rounded-full", p.color)} />
                        {p.label}
                      </div>
                      <p className="mt-1 text-xs text-muted">
                        from {cheapest ? `$${cheapest.inputUSD.toFixed(2)}` : "—"}/1M in
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-faint" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </Reveal>
    </div>
  );
}