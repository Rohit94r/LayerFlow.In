import type { ReactNode } from "react";
import { whyChoose } from "@/lib/content";
import Reveal from "./Reveal";

const iconMap: Record<string, { bg: string; icon: ReactNode }> = {
  integration: {
    bg: "bg-[#1a3a6b]/40",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="#5b9aff" strokeWidth="1.8">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  unlock: {
    bg: "bg-[#3b1f6e]/40",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="#a78bfa" strokeWidth="1.8">
        <path d="M8 11V8a4 4 0 118 0" strokeLinecap="round" />
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <circle cx="12" cy="16" r="1.5" fill="#a78bfa" />
      </svg>
    ),
  },
  shield: {
    bg: "bg-[#0f3d2e]/40",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="#34d399" strokeWidth="1.8">
        <path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z" />
        <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  chart: {
    bg: "bg-[#0c3d4a]/40",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="#22d3ee" strokeWidth="1.8">
        <rect x="4" y="14" width="3" height="6" rx="0.5" />
        <rect x="10" y="9" width="3" height="11" rx="0.5" />
        <rect x="16" y="5" width="3" height="15" rx="0.5" />
      </svg>
    ),
  },
  zap: {
    bg: "bg-[#4a2c0a]/40",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="#fbbf24" stroke="none">
        <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
      </svg>
    ),
  },
  test: {
    bg: "bg-[#4a1035]/40",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="#f472b6" strokeWidth="1.8">
        <path d="M9 3h6l1 3H8l1-3z" />
        <path d="M8 6h8v3a4 4 0 01-8 0V6z" />
        <path d="M6 14h12" strokeLinecap="round" />
        <path d="M8 18h8" strokeLinecap="round" />
      </svg>
    ),
  },
};

export default function WhyChoose() {
  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-7xl px-6 py-20 sm:px-8 sm:py-28">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-sans text-[2rem] font-semibold leading-tight text-ink sm:text-[2.5rem]">
              What you get with LayerFlow
            </h2>
            <p className="mt-4 text-[20px] font-normal leading-[28px] text-muted">
              Stop stitching together gateways, cost dashboards, and trace
              tools. LayerFlow is the production layer — one integration, full
              control.
            </p>
          </div>
        </Reveal>

        <div className="mt-14 grid gap-px overflow-hidden rounded-none border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {whyChoose.map((f, i) => {
            const visual = iconMap[f.iconKey];
            return (
              <Reveal key={f.title} delay={(i % 3) * 0.06}>
                <div className="h-full bg-bg p-8 transition-colors hover:bg-surface">
                  <div
                    className={`mb-5 inline-flex h-10 w-10 items-center justify-center rounded-lg ${visual.bg}`}
                  >
                    {visual.icon}
                  </div>
                  <h3 className="text-[1.125rem] font-semibold text-ink">
                    {f.title}
                  </h3>
                  <p className="mt-2 text-[15px] font-normal leading-[22px] text-muted">
                    {f.desc}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
