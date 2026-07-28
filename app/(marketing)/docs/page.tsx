import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Braces,
  Check,
  KeyRound,
  Layers3,
  Route,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Documentation",
  description:
    "Learn how to organize prompts, compare models, enforce AI budgets, and use the LayerFlow OpenAI-compatible gateway.",
  alternates: { canonical: "/docs" },
  openGraph: { url: "/docs" },
};

const sections = [
  { href: "#overview", label: "Overview" },
  { href: "#quickstart", label: "Quickstart" },
  { href: "#workflow", label: "Full workflow" },
  { href: "#workspace", label: "Prompt workspace" },
  { href: "#models", label: "Models and BYOK" },
  { href: "#gateway", label: "AI gateway" },
  { href: "#budgets", label: "Budgets" },
  { href: "#api", label: "API reference" },
  { href: "#local", label: "Local development" },
];

const modules = [
  {
    icon: Layers3,
    title: "Prompt Workspace",
    description:
      "Organize prompts into domains, projects, and folders. Every save creates an immutable version you can compare or restore.",
  },
  {
    icon: Sparkles,
    title: "Model Intelligence",
    description:
      "Estimate tokens and cost, compare providers, and get an explained recommendation for the cheapest suitable model.",
  },
  {
    icon: Wallet,
    title: "Cost Control",
    description:
      "Set daily or monthly hard limits. LayerFlow reserves estimated cost before a call and settles the actual cost afterward.",
  },
  {
    icon: Route,
    title: "AI Gateway",
    description:
      "Use one OpenAI-compatible endpoint with LayerFlow API keys while keeping provider billing in your own accounts.",
  },
];

const endpoints = [
  ["Workspace", "GET /api/workspaces/current", "Read the active workspace"],
  ["Prompts", "GET /api/prompts", "Search and filter saved prompts"],
  ["Prompts", "POST /api/prompts", "Create a prompt and version 1"],
  ["Versions", "POST /api/prompts/:id/versions", "Save an immutable version"],
  ["Runs", "POST /api/runs", "Run a prompt with a selected model"],
  ["Compare", "POST /api/compare", "Compare one prompt across models"],
  ["Intelligence", "POST /api/intelligence/analyze", "Estimate tokens, cost, and task type"],
  ["Budgets", "GET /api/budgets/current", "Read limits and current spend"],
  ["Keys", "POST /api/keys", "Create a LayerFlow gateway key"],
  ["Gateway", "POST /v1/chat/completions", "OpenAI-compatible model request"],
  ["Models", "GET /v1/models", "List available models"],
  ["Search", "GET /api/search?q=...", "Search prompts and sessions"],
];

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-xl border border-border bg-bg-soft p-5 font-mono text-[13px] leading-6 text-ink">
      <code>{children}</code>
    </pre>
  );
}

function SectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="max-w-3xl">
      <p className="text-sm font-medium text-brand">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
        {title}
      </h2>
      <p className="mt-3 text-base leading-7 text-muted">{description}</p>
    </div>
  );
}

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 pb-28 pt-28 sm:px-8">
      <div className="border-b border-border pb-12">
        <div className="flex items-center gap-2 text-sm text-muted">
          <BookOpen className="h-4 w-4 text-brand" />
          LayerFlow documentation
        </div>
        <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          Build, organize, and control everything you do with AI.
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-muted">
          Start with the visual workspace, then connect your applications through
          one gateway. This guide explains the product, authentication, provider
          keys, budgets, and API without assuming infrastructure experience.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/sign-in"
            className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black"
          >
            Sign in
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="#quickstart"
            className="rounded-full border border-border-strong px-5 py-2.5 text-sm text-ink hover:bg-surface-2"
          >
            Read quickstart
          </a>
        </div>
      </div>

      <div className="grid gap-12 pt-10 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <nav className="sticky top-24 space-y-1" aria-label="Documentation sections">
            <p className="mb-3 px-3 text-xs font-medium uppercase tracking-wider text-faint">
              On this page
            </p>
            {sections.map((section) => (
              <a
                key={section.href}
                href={section.href}
                className="block rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-ink"
              >
                {section.label}
              </a>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 space-y-20">
          <section id="overview" className="scroll-mt-28">
            <SectionTitle
              eyebrow="Overview"
              title="Four connected parts, one workspace"
              description="LayerFlow keeps prompt organization, model decisions, spending, and application traffic connected. A model call made from the workspace or gateway writes to the same run history and cost ledger."
            />
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {modules.map(({ icon: Icon, title, description }) => (
                <div
                  key={title}
                  className="rounded-xl border border-border bg-surface p-5"
                >
                  <Icon className="h-5 w-5 text-brand" strokeWidth={1.75} />
                  <h3 className="mt-4 text-base font-semibold text-ink">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
                </div>
              ))}
            </div>
          </section>

          <section id="quickstart" className="scroll-mt-28">
            <SectionTitle
              eyebrow="Quickstart"
              title="Start in three steps"
              description="Use the workspace without writing code. Add an API key only when you want LayerFlow to call a model or serve requests from your application."
            />
            <ol className="mt-8 space-y-4">
              {[
                ["Sign in with Google", "Open /sign-in and continue with Google. LayerFlow creates your account, default workspace, settings, budget, and starter domains."],
                ["Add a provider key", "Open Settings → Provider keys and add your OpenAI, Anthropic, Gemini, or another supported provider key. It is encrypted before storage."],
                ["Create and run a prompt", "Save a prompt, choose a model, review the token and cost estimate, then run or compare it."],
              ].map(([title, text], index) => (
                <li
                  key={title}
                  className="flex gap-4 rounded-xl border border-border p-5"
                >
                  <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-brand/10 text-sm font-medium text-brand">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="text-base font-medium text-ink">{title}</h3>
                    <p className="mt-1 text-sm leading-6 text-muted">{text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section id="workflow" className="scroll-mt-28">
            <SectionTitle
              eyebrow="Full workflow"
              title="From first login to gateway key"
              description="Follow this order the first time you use LayerFlow. You can always return to Settings to rotate keys or raise budgets."
            />
            <ol className="mt-8 space-y-4">
              {[
                [
                  "Sign in",
                  "Use Continue with Google. After the OAuth callback you land in the workspace home.",
                ],
                [
                  "Create a project and prompt",
                  "Pick a domain (Coding, Marketing, …), create a project, then New prompt. Every save writes an immutable Timeline version.",
                ],
                [
                  "Connect a provider key",
                  "Settings → Provider keys. Paste your BYOK secret once. LayerFlow never returns the full key later.",
                ],
                [
                  "Get a model suggestion",
                  "Open a prompt — the analysis panel estimates tokens/cost and recommends a cheaper suitable model.",
                ],
                [
                  "Run and compare",
                  "Run uses your selected model with hard budget checks. Compare polls a background job across multiple models.",
                ],
                [
                  "Set a budget",
                  "Cost / Budget → update monthly and daily limits. When the cap is hit, runs return 402 before the provider is called.",
                ],
                [
                  "Create a LayerFlow gateway key",
                  "Settings → Create key. Copy the lf_ secret immediately, then call https://api.layerflow.dev/v1 from your app.",
                ],
              ].map(([title, text], index) => (
                <li
                  key={title}
                  className="flex gap-4 rounded-xl border border-border p-5"
                >
                  <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-brand/10 text-sm font-medium text-brand">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="text-base font-medium text-ink">{title}</h3>
                    <p className="mt-1 text-sm leading-6 text-muted">{text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section id="workspace" className="scroll-mt-28">
            <SectionTitle
              eyebrow="Prompt workspace"
              title="Your prompt history stays understandable"
              description="Domains contain projects, projects contain folders, and folders contain prompts. Prompts have immutable versions, so restoring an older version creates a new entry instead of deleting history."
            />
            <div className="mt-7 rounded-xl border border-border bg-surface p-6">
              <div className="grid gap-3 font-mono text-sm text-muted sm:grid-cols-5">
                {["Domain", "Project", "Folder", "Prompt", "Version"].map(
                  (item, index) => (
                    <div key={item} className="flex items-center gap-3">
                      <span className="text-ink">{item}</span>
                      {index < 4 && <ArrowRight className="hidden h-3.5 w-3.5 sm:block" />}
                    </div>
                  ),
                )}
              </div>
            </div>
            <ul className="mt-6 grid gap-3 text-sm text-muted sm:grid-cols-2">
              {[
                "Search by title, body, tag, domain, project, or folder",
                "Restore without rewriting history",
                "Group prompts into ordered sessions",
                "Compare cost, latency, and output quality",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 flex-none text-brand-2" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section id="models" className="scroll-mt-28">
            <SectionTitle
              eyebrow="Models and BYOK"
              title="Your provider accounts, protected"
              description="BYOK means Bring Your Own Key. LayerFlow uses your provider account for billing and stores the key encrypted with AES-256-GCM. Raw keys are never returned by the API or written to logs."
            />
            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-border p-5">
                <KeyRound className="h-5 w-5 text-brand" />
                <h3 className="mt-3 text-base font-medium text-ink">Provider key</h3>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Authorizes LayerFlow to call OpenAI, Anthropic, Gemini,
                  DeepSeek, Groq, xAI, or OpenRouter for your workspace.
                </p>
              </div>
              <div className="rounded-xl border border-border p-5">
                <ShieldCheck className="h-5 w-5 text-brand" />
                <h3 className="mt-3 text-base font-medium text-ink">LayerFlow key</h3>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Starts with <code className="font-mono text-ink">lf_live_</code>{" "}
                  and authorizes your application to use the LayerFlow gateway.
                </p>
              </div>
            </div>
          </section>

          <section id="gateway" className="scroll-mt-28">
            <SectionTitle
              eyebrow="AI gateway"
              title="One endpoint for every supported model"
              description="Point an OpenAI-compatible client at LayerFlow, send your LayerFlow API key, and keep the familiar chat-completions request shape."
            />
            <div className="mt-7 space-y-4">
              <CodeBlock>{`import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.LAYERFLOW_API_KEY, // lf_…
  baseURL: "https://layerflow.dev/v1",
});

const result = await client.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: "Explain this simply." }],
});`}</CodeBlock>
              <CodeBlock>{`curl https://layerflow.dev/v1/chat/completions \\
  -H "Authorization: Bearer lf_...your-secret..." \\
  -H "Content-Type: application/json" \\
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"Hello"}]}'`}</CodeBlock>
            </div>
          </section>

          <section id="budgets" className="scroll-mt-28">
            <SectionTitle
              eyebrow="Hard budgets"
              title="Block overspend before the provider call"
              description="LayerFlow checks workspace, project, and API-key limits before sending a paid request. Cost is tracked in integer micro-dollars to avoid floating-point accounting errors."
            />
            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              {[
                ["1. Reserve", "Atomically reserve the estimated maximum cost in Redis."],
                ["2. Execute", "Call the selected provider only when the budget permits it."],
                ["3. Settle", "Replace the estimate with actual usage and write the durable ledger."],
              ].map(([title, text]) => (
                <div key={title} className="rounded-xl border border-border p-5">
                  <h3 className="text-sm font-medium text-ink">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{text}</p>
                </div>
              ))}
            </div>
          </section>

          <section id="api" className="scroll-mt-28">
            <SectionTitle
              eyebrow="API reference"
              title="Core endpoints"
              description="Workspace endpoints use the secure Google session cookie. Public gateway endpoints use a LayerFlow bearer key. All errors follow the same JSON error shape."
            />
            <div className="mt-7 overflow-hidden rounded-xl border border-border">
              <div className="divide-y divide-border">
                {endpoints.map(([group, path, purpose]) => (
                  <div
                    key={`${group}-${path}`}
                    className="grid gap-2 px-4 py-3 text-sm sm:grid-cols-[110px_280px_1fr]"
                  >
                    <span className="text-faint">{group}</span>
                    <code className="font-mono text-[13px] text-ink">{path}</code>
                    <span className="text-muted">{purpose}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-5">
              <CodeBlock>{`{
  "error": {
    "code": "budget_exceeded",
    "message": "This request would exceed the active budget."
  }
}`}</CodeBlock>
            </div>
          </section>

          <section id="local" className="scroll-mt-28">
            <SectionTitle
              eyebrow="Local development"
              title="Run the API on your computer"
              description="Install Docker Desktop first. Postgres stores durable data, Redis handles live budgets and queues, and the API runs on port 8787."
            />
            <div className="mt-7 space-y-4">
              <CodeBlock>{`npm install
cp apps/api/.env.example apps/api/.env
cp .env.example .env.local
npm run db:migrate --workspace @layerflow/api
npm run dev
# optional: npm run worker --workspace @layerflow/api
# local/demo only (never on Neon prod): npm run db:seed --workspace @layerflow/api`}</CodeBlock>
              <p className="flex items-start gap-2 text-sm leading-6 text-muted">
                <Braces className="mt-1 h-4 w-4 flex-none text-brand" />
                Start the worker in a second terminal with{" "}
                <code className="font-mono text-ink">
                  npm run worker --workspace @layerflow/api
                </code>
                .
              </p>
            </div>
          </section>

          <div className="rounded-2xl border border-border bg-surface p-7 sm:p-9">
            <h2 className="text-xl font-semibold text-ink">Ready to try LayerFlow?</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Open the workspace to create your first project and prompt.
            </p>
            <Link
              href="/sign-in"
              className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-brand hover:underline"
            >
              Sign in to open workspace
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
