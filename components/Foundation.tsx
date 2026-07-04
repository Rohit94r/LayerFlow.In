/* eslint-disable @next/next/no-img-element */
import { Github } from "lucide-react";
import { stats, integrations, site } from "@/lib/content";
import Reveal from "./Reveal";

export default function Foundation() {
  return (
    <section className="relative overflow-hidden border-y border-border bg-bg-soft">
      <div className="absolute inset-0 grid-lines" />
      <div className="relative mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold text-ink sm:text-4xl">
              Built for AI in production
            </h2>
            <p className="mt-4 text-muted">
              A serverless gateway, atomic budget counters, and time-series
              trace storage — trusted to power AI workloads at scale.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.05}>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
            <a
              href={site.github}
              target="_blank"
              rel="noreferrer"
              className="glass-pill inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm text-ink"
            >
              <Github className="h-4 w-4" />
              layerflow/layerflow
              <span className="ml-1 text-faint">★ {site.githubStars}</span>
            </a>
            <span className="text-sm text-faint">
              {site.monthlyRequests} requests proxied every month
            </span>
          </div>
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
            Works with any framework
          </p>
          <div className="mt-8 grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3">
            {integrations.map((it) => (
              <div
                key={it.name}
                className="group flex h-28 flex-col items-center justify-center gap-3 bg-bg transition-colors hover:bg-surface"
              >
                <span className="logo-chip flex h-12 w-12 items-center justify-center rounded-xl">
                  <img
                    src={it.src}
                    alt={it.name}
                    className="h-7 w-7 object-contain opacity-90 transition-opacity group-hover:opacity-100"
                    loading="lazy"
                  />
                </span>
                <span className="text-xs text-muted">{it.name}</span>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
