import Link from "next/link";
import type { Metadata } from "next";
import {
  Sparkles,
  Bot,
  Globe,
  KeyRound,
  FileCode2,
  CopyCheck,
  Cpu,
  Wand2,
  ArrowRight,
} from "@/components/ui/icons";
import { Reveal } from "@/components/ui/reveal";
import { CodeBlock } from "@/components/marketing/CodeBlock";

export const metadata: Metadata = {
  title: "Docs",
  description:
    "LayerFlow docs — install the CLI, code from the terminal, run agents in the browser, and keep every bit of AI context.",
  alternates: { canonical: "/docs" },
  openGraph: { url: "/docs" },
};

const CLI_COMMANDS = [
  {
    command: `lf`,
    what: "Launch the full-screen terminal UI — home, streaming chat, sessions, model switcher and command palette.",
  },
  {
    command: `lf run "build a landing page"`,
    what: "Run a single task with live step streaming and tool approvals — prompt, cost and model handled for you.",
  },
  {
    command: `lf chat "explain the auth flow"`,
    what: "Start a streaming chat session with the LayerFlow gateway. Continue the same session in the web app.",
  },
  {
    command: `lf sessions`,
    what: "List persisted sessions for the current project and reopen any past one with `--id`.",
  },
  {
    command: `lf sync`,
    what: "Push/pull your sessions, context and cost ledger between the terminal and the cloud.",
  },
  {
    command: `lf cost --project`,
    what: "Show token and dollar usage from the local store — keep an eye on what each project is spending.",
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
            Install once. <span className="text-brand">Code anywhere.</span>
          </h1>
          <p className="mt-4 text-lg text-muted">
            Use LayerFlow in your browser with zero setup — or install the
            terminal CLI and code from anywhere. Both share the same sessions,
            context and cost ledger.
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
            One command, nothing else. No API keys, no config files, no account
            needed to try it.
          </p>
        </Reveal>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <Reveal>
            <div className="rounded-xl border border-border bg-surface-2/40 p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-faint">macOS / Linux</p>
              <div className="mt-2">
                <CodeBlock code="curl -fsSL https://raw.githubusercontent.com/Rohit94r/layerflow-releases/main/install.sh | bash" />
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.05}>
            <div className="rounded-xl border border-border bg-surface-2/40 p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-faint">Windows (WSL)</p>
              <div className="mt-2">
                <CodeBlock code="curl -fsSL https://raw.githubusercontent.com/Rohit94r/layerflow-releases/main/install.sh | bash" />
              </div>
              <p className="mt-3 text-xs text-faint">
                Works inside WSL (Ubuntu). Or grab the <span className="font-mono">.zip</span> from the latest release.
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
                → <span className="font-mono text-emerald-400">lf 0.1.0</span> — the first public release
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Quick start ── */}
      <section className="mt-16">
        <Reveal>
          <h2 className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight text-ink">
            <Sparkles className="h-5 w-5 text-brand" />
            Quick start — terminal
          </h2>
          <p className="mt-3 max-w-2xl text-muted">
            Write plain English, click Improve in the web app, or just run it —
            LayerFlow sharpens the prompt, picks a model, checks cost, and runs
            agents for you.
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
            Use it in the browser — zero install
          </h2>
          <p className="mt-3 max-w-2xl text-muted">
            Everything the CLI does, without installing anything:
          </p>
        </Reveal>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: FileCode2, title: "Coding Workspace", text: "Plain English in, working code out. Improve, then run with agents." },
            { icon: Wand2, title: "Improve in Chat", text: "One click in any chat: your rough prompt becomes a sharp, low-token prompt — scored 0–100." },
            { icon: Bot, title: "Build Agents", text: "Create your own specialist agents with custom prompts and models, then run them from the web." },
            { icon: CopyCheck, title: "Rescue Chat", text: "Paste a dead AI chat and get a clean prompt, compressed context and Continue Pack." },
            { icon: KeyRound, title: "BYOK", text: "Bring your own API keys. Pay providers directly — never resold credits." },
            { icon: Cpu, title: "Cost Check", text: "Dollar estimates before every run, plus the cheapest good-enough model." },
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
            href="/agents"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-medium text-black transition-transform hover:scale-[1.02]"
          >
            Open the web workspace <ArrowRight className="h-4 w-4" />
          </Link>
        </Reveal>
      </section>

      {/* ── Architecture ── */}
      <section id="architecture" className="mt-16 scroll-mt-28">
        <Reveal>
          <h2 className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight text-ink">
            <Bot className="h-5 w-5 text-brand" />
            How it works
          </h2>
          <p className="mt-3 max-w-2xl text-muted">
            One session format everywhere. Web, terminal CLI and agents all
            write to the same session store, so nothing gets lost when you
            switch surfaces.
          </p>
        </Reveal>
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {[
            { step: "1", title: "Prompt Improver", text: "Plain English in. Clarity, context, constraints and output format added — scored 0–100 before it runs." },
            { step: "2", title: "Agents", text: "Implement, review and test agents run with tool calls: read/edit files, run commands, check diffs." },
            { step: "3", title: "Context & sessions", text: "Every run saves an AI summary, a prompt and a Continue Pack. Resume from any surface." },
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
