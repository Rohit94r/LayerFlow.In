import Link from "next/link";
import type { Metadata } from "next";
import {
  Sparkles,
  KeyRound,
  Globe,
  ShieldCheck,
  BarChart3,
  History,
  ArrowRight,
} from "@/components/ui/icons";
import { Reveal } from "@/components/ui/reveal";
import { CodeBlock } from "@/components/marketing/CodeBlock";

export const metadata: Metadata = {
  title: "Docs & Guides — Gateway, Keys & Cost Control",
  description:
    "LayerFlow docs — get an OpenAI-compatible gateway key, bring your own provider keys, set hard budget caps, and read your usage history.",
  alternates: { canonical: "/docs" },
  openGraph: { url: "/docs" },
};

const CLI_COMMANDS = [
  {
    command: `lf login`,
    what: "Paste your LayerFlow API key from the dashboard — the gateway then meters every request, no provider keys needed on your machine.",
  },
  {
    command: `lf chat "explain the auth flow"`,
    what: "Stream a chat through the gateway. Same OpenAI-compatible call as the API — budgets, usage and alerts all apply.",
  },
  {
    command: `lf config key openai sk-...`,
    what: "Set a provider key for direct mode — no account needed. lf chats straight to the provider at your configured base URL.",
  },
  {
    command: `lf models`,
    what: "List the models your workspace can use right now, and which are available.",
  },
  {
    command: `lf cost --project`,
    what: "Show token and dollar usage — keep an eye on what each project is spending.",
  },
  {
    command: `lf doctor`,
    what: "Run local diagnostics: config, storage, keychain and audit checks.",
  },
];

function Tabs() {
  return (
    <div className="space-y-6">
      {CLI_COMMANDS.map((c, i) => (
        <Reveal key={c.command} delay={i * 0.05}>
          <div className="overflow-hidden rounded-xl border border-border bg-surface-2/40">
            <CodeBlock code={c.command} />
            <p className="border-t border-border px-4 py-3 text-sm leading-relaxed text-muted">
              {c.what}
            </p>
          </div>
        </Reveal>
      ))}
    </div>
  );
}

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 pb-20 pt-28 sm:px-8 sm:pt-32">
      <Reveal>
        <div className="mx-auto max-w-2xl text-center">
          <span className="glass-pill inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-brand">
            Docs
          </span>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
            One gateway. <span className="text-brand">Zero surprise bills.</span>
          </h1>
          <p className="mt-4 text-lg text-muted">
            Route every model call through LayerFlow — your keys, hard budget
            caps, alerts at 50/80/100%, and usage history that explains itself.
          </p>
        </div>
      </Reveal>

      {/* ── Install ── */}
      <section id="install" className="mt-16 scroll-mt-28">
        <Reveal>
          <h2 className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight text-ink">
            <Sparkles className="h-5 w-5 text-brand" />
            Install the terminal CLI
          </h2>
          <p className="mt-3 max-w-2xl text-muted">
            One command, nothing else. Point it at the gateway with
            <span className="font-mono"> lf login</span> — or skip login entirely
            and chat directly to a provider with your own key.
          </p>
        </Reveal>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <Reveal>
            <div className="rounded-xl border border-border bg-surface-2/40 p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-faint">macOS / Linux</p>
              <div className="mt-2">
                <CodeBlock code="curl -fsSL https://layerflow.dev/install | bash" />
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.05}>
            <div className="rounded-xl border border-border bg-surface-2/40 p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-faint">Windows (PowerShell)</p>
              <div className="mt-2">
                <CodeBlock code='powershell -ExecutionPolicy Bypass -c "irm https://layerflow.dev/install.ps1 | iex"' />
              </div>
              <p className="mt-3 text-xs text-faint">
                Runs in PowerShell or Windows Terminal. Works in Git Bash / WSL too — just use the macOS/Linux command.
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="rounded-xl border border-dashed border-border bg-surface-2/40 p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-faint">verify</p>
              <div className="mt-2">
                <CodeBlock code="lf version" />
              </div>
              <p className="mt-3 text-xs text-faint">
                → <span className="font-mono text-emerald-400">lf 0.2.6</span> — the latest release
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Gateway quick start ── */}
      <section className="mt-16">
        <Reveal>
          <h2 className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight text-ink">
            <KeyRound className="h-5 w-5 text-brand" />
            Gateway quick start — 2 minutes
          </h2>
          <p className="mt-3 max-w-2xl text-muted">
            Create an API key, call one OpenAI-compatible endpoint, and your
            spend is capped and tracked from the first request.
          </p>
        </Reveal>
        <div className="mt-6">
          <Tabs />
        </div>
      </section>

      {/* ── Web ── */}
      <section className="mt-16">
        <Reveal>
          <h2 className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight text-ink">
            <Globe className="h-5 w-5 text-brand" />
            Everything in the dashboard
          </h2>
          <p className="mt-3 max-w-2xl text-muted">
            Keys, models, budgets and history — no install required:
          </p>
        </Reveal>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: KeyRound, title: "Platform Keys", text: "Create lf_live_… keys for the gateway in seconds. Use them from any OpenAI-compatible client." },
            { icon: ShieldCheck, title: "BYOK Vault", text: "Bring your own provider keys (OpenAI, Anthropic, DeepSeek, Groq…). Zero markup, zero resale." },
            { icon: BarChart3, title: "Hard Budget Caps", text: "Set a monthly cap per workspace — requests hard-block at 100%, no exceptions." },
            { icon: History, title: "Alerts + Usage History", text: "Email alerts at 50/80/100%. Every request shows model, tokens, project and exact cost." },
            { icon: Sparkles, title: "Direct Mode", text: "Point lf or any client straight at your provider with x-lf-provider — no account needed." },
            { icon: Globe, title: "Per-Project Spend", text: "Tag any request with x-lf-project: client-acme and see spend attributed instantly." },
          ].map((f, i) => (
            <Reveal key={f.title} delay={i * 0.05}>
              <div className="card card-hover h-full p-5">
                <f.icon className="h-5 w-5 text-brand" />
                <h3 className="mt-3 text-sm font-semibold text-ink">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{f.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal>
          <Link
            href="/keys"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-medium text-black transition-transform hover:scale-[1.02]"
          >
            Create your first key <ArrowRight className="h-4 w-4" />
          </Link>
        </Reveal>
      </section>

      {/* ── How it works ── */}
      <section id="architecture" className="mt-16 scroll-mt-28">
        <Reveal>
          <h2 className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight text-ink">
            <ShieldCheck className="h-5 w-5 text-brand" />
            How it works
          </h2>
          <p className="mt-3 max-w-2xl text-muted">
            Calls enter the gateway, a key mode is resolved (direct, BYOK, or
            platform), cost is computed from the live model registry, and a
            budget cap + alert tier runs before the request counts.
          </p>
        </Reveal>
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {[
            { step: "1", title: "Keys & modes", text: "x-lf-provider-key says direct (never stored), x-lf-key provides a BYOK vault key, platform keys are plan-gated and demo-capped." },
            { step: "2", title: "Budgets & alerts", text: "Every request counts against the workspace limit. At 50/80/100% an email fires; at 100% new calls hard-block." },
            { step: "3", title: "Usage history", text: "Each completion records model, tokens, project tag and cost to 4 decimals — exportable, always." },
          ].map((s, i) => (
            <Reveal key={s.step} delay={i * 0.06}>
              <div className="relative h-full rounded-2xl border border-border bg-surface-2/40 p-6">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-sm font-bold text-[#0e1416]">
                  {s.step}
                </span>
                <h3 className="mt-4 text-base font-semibold text-ink">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    </div>
  );
}
