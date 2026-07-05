/* eslint-disable @next/next/no-img-element */
import { stats, integrations } from "@/lib/content";
import Reveal from "./Reveal";

export default function Foundation() {
  return (
    <section className="relative overflow-hidden border-y border-border bg-bg-soft">
      <div className="absolute inset-0 grid-lines" />
      <div className="relative mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold text-ink sm:text-4xl">
              Infrastructure your AI apps actually need
            </h2>
            <p className="mt-4 text-muted">
              A serverless gateway, atomic budget counters, and time-series
              trace storage — designed for teams shipping agents and LLM
              features to production.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.05}>
          <p className="mt-10 text-center text-sm text-faint">
            BYOK · hard budget limits · no vendor lock-in
          </p>
        </Reveal>

        <div className="mt-14 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border lg:grid-cols-4">
          {stats.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.06}>
              <div className="bg-bg p-8 text-center">
                <div className="font-sans text-3xl font-semibold text-ink sm:text-4xl">
                  {s.value}
                </div>
                <div className="mt-2 text-sm text-muted">{s.label}</div>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.1}>
          <p className="mt-20 text-center text-sm font-medium text-faint">
            Drop into your existing stack
          </p>
          <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-3 md:grid-cols-5">
            {integrations.map((it) => (
              <div
                key={it.name}
                className="group flex h-32 flex-col items-center justify-center gap-3 bg-bg transition-colors hover:bg-surface"
              >
                <img
                  src={it.src}
                  alt={it.name}
                  className="logo-mono h-10 w-auto object-contain"
                  loading="lazy"
                />
                <span className="text-sm text-muted">{it.name}</span>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
