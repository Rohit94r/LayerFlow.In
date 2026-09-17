import type { Metadata } from "next";
import Link from "next/link";
import {
  KeyRound,
  ShieldCheck,
  History,
  Bot,
  ArrowRight,
  Sparkles,
  Wallet,
  Layers,
} from "@/components/ui/icons";
import { Reveal } from "@/components/ui/reveal";

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "@id": "https://layerflow.dev/about#page",
    name: "About LayerFlow",
    url: "https://layerflow.dev/about",
    description:
      "LayerFlow builds the AI workspace that never forgets — BYOK keys, hard budget caps, rescue for dead AI sessions, and multi-agent coding that runs in the background.",
    isPartOf: { "@id": "https://layerflow.dev/#website" },
    about: { "@id": "https://layerflow.dev/#org" },
  },
  {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": "https://layerflow.dev/about#founder",
    name: "Rohit Jadhav",
    jobTitle: "Founder",
    worksFor: { "@id": "https://layerflow.dev/#org" },
    url: "https://layerflow.dev/about",
  },
];

export const metadata: Metadata = {
  title: "About LayerFlow — The AI Workspace That Never Forgets",
  description:
    "LayerFlow is built by Rohit Jadhav to end lost context, token waste, and dead AI chats. BYOK keys, hard budget limits, session sync, and agents that do the background work.",
  alternates: { canonical: "/about" },
  openGraph: { url: "/about", type: "website" },
  twitter: { card: "summary_large_image" },
};

const PILLARS = [
  {
    icon: KeyRound,
    title: "Your keys, your prices",
    body: "Connect your own OpenAI, Anthropic, Google and DeepSeek keys with zero markup, capped by hard monthly budgets you set.",
  },
  {
    icon: ShieldCheck,
    title: "Control before cost",
    body: "Budget limits, request caps, approvals and a visible cost line on everything — no surprise AI bills, ever.",
  },
  {
    icon: History,
    title: "Never re-explain",
    body: "Every session keeps its context. Rescue a dead chat, compress it, and carry the work into any model in under a second.",
  },
  {
    icon: Bot,
    title: "Agents that do the busywork",
    body: "Build your own agents for coding, job applications and freelancing clients — they run in the background and report back.",
  },
];

export default function AboutPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="mx-auto max-w-5xl px-5 pb-20 pt-28 sm:px-8 sm:pt-32">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <span className="glass-pill inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-brand">
              About LayerFlow
            </span>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
              The AI workspace that{" "}
              <span className="text-brand">never forgets.</span>
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-muted">
              LayerFlow is a bring-your-own-key AI workspace where context
              survives, budgets hold, dead chats get rescued, and agents do the
              background work instead of you.
            </p>
          </div>
        </Reveal>

        {/* ── Story ── */}
        <section className="mt-20">
          <Reveal>
            <div className="overflow-hidden rounded-2xl border border-border bg-surface-2/40">
              <div className="grid gap-8 p-8 sm:p-12 md:grid-cols-[1.3fr_1fr]">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-brand">
                    Our story
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold tracking-tight text-ink">
                    Started because 11&nbsp;PM rate limits kept eating the work
                  </h2>
                  <div className="mt-5 space-y-4 text-base leading-relaxed text-muted">
                    <p>
                      LayerFlow began with a simple frustration: every time an
                      AI chat hit a rate limit, switched models, or lost
                      context, the same project had to be re-explained from
                      scratch — and the same tokens paid for twice.
                    </p>
                    <p>
                      So we built the workspace we wanted. Plain English in,
                      improved prompts out. One shared memory between the
                      browser and the terminal. Agents that plan, write, review
                      and test — or hunt a job and pitch a client while you
                      sleep.
                    </p>
                    <p>
                      Every decision since has followed one rule:{" "}
                      <Link
                        href="/docs"
                        className="font-medium text-brand hover:underline"
                      >
                        you stay in control
                      </Link>
                      . Your keys, your budget, your approvals.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col justify-end rounded-xl border border-border bg-surface-2/60 p-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface-2 text-brand">
                      <Sparkles size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-ink">
                        Rohit Jadhav
                      </p>
                      <p className="text-xs text-muted">Founder</p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-muted">
                    &ldquo;We don&rsquo;t sell tokens. We sell the last time you
                    re-explain your project to an AI.&rdquo;
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ── Pillars ── */}
        <section className="mt-20">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-brand">
                What we stand for
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                Four things we refuse to get wrong
              </h2>
            </div>
          </Reveal>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {PILLARS.map((p, i) => (
              <Reveal key={p.title} delay={i * 0.05}>
                <div className="flex h-full flex-col rounded-xl border border-border bg-surface-2/40 p-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10 text-brand">
                    <p.icon size={18} />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-ink">
                    {p.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    {p.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── In one line ── */}
        <section className="mt-20">
          <Reveal>
            <div className="rounded-2xl border border-border bg-surface-2/40 p-8 text-center sm:p-12">
              <div className="mx-auto flex max-w-xl flex-col items-center gap-4">
                <div className="flex items-center gap-3 text-brand">
                  <Wallet size={18} />
                  <span className="text-sm font-medium">
                    Browser + Terminal · BYOK · Hard budgets
                  </span>
                  <Layers size={18} />
                </div>
                <p className="text-lg leading-relaxed text-muted">
                  One workspace for the AI work that matters to you — from
                  coding and cost control to job applications and freelancing
                  clients.
                </p>
                <Link
                  href="/sign-in"
                  className="group mt-2 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-[0_2px_10px_rgba(249,115,22,0.4)] transition-transform hover:-translate-y-px"
                >
                  Start free <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </Reveal>
        </section>
      </div>
    </>
  );
}