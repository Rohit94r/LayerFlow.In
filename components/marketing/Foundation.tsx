/* eslint-disable @next/next/no-img-element */
import { proofPoints, integrations } from "@/lib/marketing-content";
import Reveal from "./Reveal";

export default function Foundation() {
  return (
    <section className="relative overflow-hidden border-y border-border bg-bg-soft">
      <div className="absolute inset-0 grid-lines" />
      <div className="relative mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold text-ink sm:text-4xl">
              Built for how you actually use AI
            </h2>
            <p className="mt-4 text-muted">
              A workspace for prompt organization and cost control — not another
              infrastructure control plane.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.05}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            {proofPoints.map((point) => (
              <span
                key={point}
                className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-ink"
              >
                {point}
              </span>
            ))}
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <p className="mt-20 text-center text-sm font-medium text-faint">
            Connect every major LLM in one workspace
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
