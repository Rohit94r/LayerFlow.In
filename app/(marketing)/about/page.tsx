import { ArrowRight } from "lucide-react";
import { aboutValues, journeySteps, site } from "@/lib/marketing-content";
import Reveal from "@/components/marketing/Reveal";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description:
    "LayerFlow is the AI workspace for prompts, models, and cost control — built for developers and AI power users.",
  alternates: { canonical: "/about" },
  openGraph: { url: "/about" },
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 pb-24 pt-32 sm:px-8">
      <Reveal>
        <div className="mx-auto max-w-3xl">
          <p className="text-sm font-medium text-brand">About LayerFlow</p>
          <h1 className="mt-3 font-sans text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
            {site.headline}
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-muted">
            {site.subtitle}
          </p>
          <p className="mt-4 text-lg leading-relaxed text-muted">
            People store prompts in Notion, Google Docs, Notes, ChatGPT history,
            and Gists. Nobody manages prompts well. The problem isn&apos;t
            gateway infrastructure — it&apos;s workflow organization and cost
            control. LayerFlow fixes both.
          </p>
        </div>
      </Reveal>

      <Reveal delay={0.08}>
        <div className="mx-auto mt-16 max-w-3xl rounded-2xl border border-border bg-surface p-8 sm:p-10">
          <h2 className="text-xl font-semibold text-ink">What we believe</h2>
          <div className="mt-8 grid gap-8 sm:grid-cols-2">
            {aboutValues.map((v) => (
              <div key={v.title}>
                <h3 className="font-semibold text-ink">{v.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {v.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.12}>
        <div className="mx-auto mt-16 max-w-3xl text-center">
          <h2 className="text-2xl font-semibold text-ink">The journey we support</h2>
          <p className="mt-4 text-muted">
            {journeySteps.join(" → ")}
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <a
              href={site.workspaceHref}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black transition-transform hover:scale-[1.02]"
            >
              Open workspace
              <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href={site.pricingHref}
              className="inline-flex items-center gap-2 rounded-xl border border-border-strong px-6 py-3 text-sm font-semibold text-ink transition-colors hover:bg-surface-2"
            >
              View pricing
            </a>
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.16}>
        <div className="mx-auto mt-20 max-w-xl text-center">
          <h2 className="text-xl font-semibold text-ink">Contact</h2>
          <p className="mt-3 text-muted">
            Questions, feedback, or enterprise interest — reach out at{" "}
            <a
              href="mailto:hello@layerflow.dev"
              className="text-brand hover:underline"
            >
              hello@layerflow.dev
            </a>
            .
          </p>
        </div>
      </Reveal>
    </div>
  );
}
