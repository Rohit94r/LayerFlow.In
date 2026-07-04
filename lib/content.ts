export const site = {
  name: "LayerFlow",
  tagline: "Production infrastructure for AI applications",
  github: "https://github.com/Rohit94r/LayerFlow.in",
  githubStars: "26K",
  monthlyRequests: "30M+",
  docsCommand: "npx layerflow@latest init",
};

export const nav = [
  {
    label: "Components",
    items: [
      { title: "Observability", desc: "Trace every agent step in production.", href: "#observability" },
      { title: "Cost Analytics", desc: "See spend per model, key, and user.", href: "#cost" },
      { title: "AI Gateway", desc: "One integration for every provider.", href: "#gateway" },
      { title: "Authentication", desc: "API keys per workspace, project, and plan.", href: "#authentication" },
      { title: "Security & Validation", desc: "Prompt injection and PII protection.", href: "#security" },
      { title: "Rate Limiting", desc: "Queue traffic so providers never reject spikes.", href: "#rate-limiting" },
      { title: "Smart Model Router", desc: "Route by task, tokens, or cost.", href: "#routing" },
      { title: "Prompt Management", desc: "Version, compare, and roll back prompts.", href: "#prompts" },
      { title: "Caching & Reliability", desc: "Never pay for the same call twice.", href: "#caching" },
      { title: "AI Evaluation", desc: "Regression tests on every deploy.", href: "#evaluation" },
      { title: "Dashboard", desc: "Costs, traces, alerts, and billing in one place.", href: "#dashboard" },
    ],
  },
  { label: "Releases", href: "#blog" },
  { label: "Blog", href: "#blog" },
  {
    label: "Docs",
    items: [
      { title: "Quickstart", desc: "From zero to first trace in 5 minutes.", href: "#docs" },
      { title: "SDK Reference", desc: "TypeScript drop-in for OpenAI client.", href: "#docs" },
      { title: "API Reference", desc: "REST endpoints for traces, costs, keys.", href: "#docs" },
    ],
  },
  {
    label: "Resources",
    items: [
      { title: "Pricing", desc: "Free, Pro, and Scale plans.", href: "#pricing" },
      { title: "FAQ", desc: "Common questions about LayerFlow.", href: "#faq" },
      { title: "GitHub", desc: "Open source SDK and examples.", href: "https://github.com/Rohit94r/LayerFlow.in" },
    ],
  },
];

export const heroBadges = [
  { label: "Apache-2.0 friendly SDK" },
  { label: "26K+ GitHub Stars" },
  { label: "30M+ Requests / mo" },
];

export const companies = [
  { name: "Meta", src: "/images/companies/meta.svg" },
  { name: "MosaicML", src: "/images/companies/mosaicml.svg" },
  { name: "Zillow", src: "/images/companies/zillow.svg" },
  { name: "Toyota", src: "/images/companies/toyota.svg" },
  { name: "Booking", src: "/images/companies/booking.svg" },
  { name: "Microsoft", src: "/images/companies/microsoft.svg" },
  { name: "Accenture", src: "/images/companies/accenture.svg" },
  { name: "ASML", src: "/images/companies/asml.svg" },
  { name: "Wix", src: "/images/companies/wix.svg" },
];

export type Feature = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  bullets: string[];
  cta: { label: string; href: string }[];
  code: { lang: string; lines: string[] };
  reverse?: boolean;
};

export const features: Feature[] = [
  {
    id: "observability",
    eyebrow: "Observability",
    title: "See every step of every agent run",
    body: "Capture full traces of your LLM apps and agents — prompts, tool calls, responses, tokens, latency, and cost. Built on OpenTelemetry and works with any provider or agent framework.",
    bullets: [
      "Full request + response payload per trace",
      "Session timelines group multi-step agent runs",
      "Filter by model, status, cost, and latency",
    ],
    cta: [
      { label: "Quickstart", href: "#docs" },
      { label: "Try Demo", href: "#demo" },
    ],
    code: {
      lang: "typescript",
      lines: [
        "import { LayerFlow } from '@layerflow/gateway'",
        "",
        "const lf = new LayerFlow({ apiKey: process.env.LF_KEY })",
        "",
        "const res = await lf.chat.completions.create({",
        "  model: 'gpt-4o',",
        "  messages: [{ role: 'user', content: 'Summarize Q3.' }],",
        "  layerflow: { sessionId: 'sess_123', userId: 'u_42' },",
        "})",
        "",
        "// → res.layerflow.traceId, cost, latencyMs, cacheHit",
      ],
    },
  },
  {
    id: "cost",
    eyebrow: "Cost Analytics",
    title: "Know exactly where every dollar goes",
    body: "Real-time cost tracking broken down by model, API key, feature, and individual end-user. Set hard daily and monthly budgets that stop runaway spend before it happens.",
    bullets: [
      "Per-model, per-key, and per-user cost breakdown",
      "Hard budget limits enforced at the edge (HTTP 402)",
      "Alerts at 80% budget and on error-rate spikes",
    ],
    cta: [
      { label: "Quickstart", href: "#docs" },
      { label: "Try Demo", href: "#demo" },
    ],
    reverse: true,
    code: {
      lang: "typescript",
      lines: [
        "const lf = new LayerFlow({",
        "  apiKey: process.env.LF_KEY,",
        "  budget: {",
        "    daily: 50,       // $50 / day hard cap",
        "    monthly: 500,    // $500 / month hard cap",
        "    perUser: 0.1,    // $0.10 per user / day",
        "    onExceeded: 'error',",
        "  },",
        "})",
      ],
    },
  },
  {
    id: "gateway",
    eyebrow: "AI Gateway",
    title: "One integration for every provider",
    body: "A unified, OpenAI-compatible gateway for OpenAI, Anthropic, Gemini, Groq, and more. Route requests, handle fallbacks, and switch providers by changing a single string — no rewrites.",
    bullets: [
      "Drop-in replacement — change one import",
      "Smart model routing by task, tokens, or cost",
      "Automatic retries and cross-provider fallback",
    ],
    cta: [{ label: "Quickstart", href: "#docs" }],
    code: {
      lang: "typescript",
      lines: [
        "// Same code — just change the model string",
        "await lf.chat.completions.create({",
        "  model: 'gpt-4o',            // OpenAI",
        "  messages,",
        "})",
        "",
        "await lf.chat.completions.create({",
        "  model: 'claude-3-5-sonnet', // Anthropic",
        "  messages,",
        "})",
      ],
    },
  },
  {
    id: "caching",
    eyebrow: "Caching & Reliability",
    title: "Never pay for the same call twice",
    body: "Exact-match and semantic caching return responses in under 5ms at zero cost. Built-in retries, timeouts, and fallback chains give you production reliability without custom code.",
    bullets: [
      "SHA-256 exact-match + embedding semantic cache",
      "See real dollars saved from every cache hit",
      "Exponential backoff, timeouts, fallback chains",
    ],
    cta: [
      { label: "Quickstart", href: "#docs" },
      { label: "Try Demo", href: "#demo" },
    ],
    reverse: true,
    code: {
      lang: "typescript",
      lines: [
        "const lf = new LayerFlow({",
        "  apiKey: process.env.LF_KEY,",
        "  cache: { enabled: true, ttl: '24h', type: 'semantic' },",
        "  reliability: {",
        "    maxRetries: 3,",
        "    fallbackChain: ['gpt-4o', 'claude-3-5-sonnet'],",
        "    timeout: 30000,",
        "  },",
        "})",
      ],
    },
  },
  {
    id: "authentication",
    eyebrow: "Authentication",
    title: "Scoped API keys for every environment",
    body: "Create named keys for production, staging, and development. Each key tracks its own costs, traces, and budget. Revoke instantly without touching application code.",
    bullets: [
      "Keys hashed with bcrypt — shown once at creation",
      "Per-key cost, trace, and budget attribution",
      "Workspace, project, and plan scoping",
    ],
    cta: [{ label: "Quickstart", href: "#docs" }],
    code: {
      lang: "typescript",
      lines: [
        "// Create keys in dashboard or via API",
        "POST /v1/keys  { name: 'production' }",
        "",
        "const lf = new LayerFlow({",
        "  apiKey: 'lf_prod_abc123',  // scoped key",
        "})",
      ],
    },
  },
  {
    id: "security",
    eyebrow: "Security & Validation",
    title: "Protect production agents before they reach the model",
    body: "Validate prompt size, context limits, and file uploads. Scan for prompt injection, jailbreak attempts, and PII leakage — block or warn before any provider call.",
    bullets: [
      "Prompt injection and jailbreak detection",
      "PII leakage scanning on every request",
      "Configurable warn-only or block-and-return modes",
    ],
    cta: [{ label: "Quickstart", href: "#docs" }],
    reverse: true,
    code: {
      lang: "typescript",
      lines: [
        "const lf = new LayerFlow({",
        "  apiKey: process.env.LF_KEY,",
        "  security: {",
        "    scanPrompts: true,",
        "    blockOnThreat: true,",
        "    piiDetection: true,",
        "  },",
        "})",
      ],
    },
  },
  {
    id: "rate-limiting",
    eyebrow: "Rate Limiting",
    title: "Shape traffic so providers never reject you",
    body: "When a customer sends 1,000 requests per second, LayerFlow queues and shapes traffic instead of letting OpenAI reject the burst. No crashes, no surprise 429s.",
    bullets: [
      "Per-key and per-user rate limits",
      "Request queuing under load spikes",
      "Atomic Redis counters at the edge",
    ],
    cta: [{ label: "Quickstart", href: "#docs" }],
    code: {
      lang: "typescript",
      lines: [
        "const lf = new LayerFlow({",
        "  apiKey: process.env.LF_KEY,",
        "  rateLimit: {",
        "    requestsPerSecond: 100,",
        "    queueOverflow: 'reject',",
        "  },",
        "})",
      ],
    },
  },
  {
    id: "routing",
    eyebrow: "Smart Model Router",
    title: "Send every request to the right model automatically",
    body: "Simple questions go to Gemini Flash. Complex coding goes to Claude. Images go to GPT-4 Vision. Define rules by tokens, task type, or cost — save 60–70% with no quality loss.",
    bullets: [
      "Rule-based routing by tokens, task, or cost",
      "Automatic fallback chains across providers",
      "Switch models without changing application code",
    ],
    cta: [{ label: "Quickstart", href: "#docs" }],
    reverse: true,
    code: {
      lang: "typescript",
      lines: [
        "routing: {",
        "  rules: [",
        "    { if: 'inputTokens < 500', use: 'gpt-4o-mini' },",
        "    { if: 'task === \"summarize\"', use: 'claude-3-haiku' },",
        "  ],",
        "  fallback: ['gpt-4o', 'claude-3-5-sonnet'],",
        "}",
      ],
    },
  },
  {
    id: "prompts",
    eyebrow: "Prompt Management",
    title: "Version, test, and roll back every prompt",
    body: "Store every prompt with full lineage. Compare results across versions, roll back in one click, and see which prompt version produced which trace in production.",
    bullets: [
      "Prompt Version 1 → 2 → 3 with diff view",
      "Link prompt versions to trace outcomes",
      "Rollback to any previous version instantly",
    ],
    cta: [
      { label: "Quickstart", href: "#docs" },
      { label: "Try Demo", href: "#demo" },
    ],
    code: {
      lang: "typescript",
      lines: [
        "const res = await lf.chat.completions.create({",
        "  model: 'gpt-4o',",
        "  messages,",
        "  layerflow: {",
        "    promptVersion: 'support-v3',",
        "    metadata: { feature: 'support-bot' },",
        "  },",
        "})",
      ],
    },
  },
  {
    id: "evaluation",
    eyebrow: "AI Evaluation",
    title: "Catch regressions before users do",
    body: "Write test cases for your agent. Run them on every GitHub commit. Get alerts if accuracy, relevance, or quality degrades after a model or prompt update.",
    bullets: [
      "Exact, semantic, and custom evaluators",
      "GitHub Action runs tests on every push",
      "Dashboard shows pass/fail per test case",
    ],
    cta: [
      { label: "Quickstart", href: "#docs" },
      { label: "Try Demo", href: "#demo" },
    ],
    reverse: true,
    code: {
      lang: "typescript",
      lines: [
        "layerflow.test('extracts entity correctly', {",
        "  input: { role: 'user', content: 'My name is Rohit' },",
        "  expect: {",
        "    contains: ['Rohit'],",
        "    evaluator: 'semantic',",
        "    threshold: 0.9,",
        "  },",
        "})",
      ],
    },
  },
  {
    id: "dashboard",
    eyebrow: "Dashboard",
    title: "Everything in one place",
    body: "Overview, projects, API keys, requests, analytics, cost, logs, models, prompt versions, errors, alerts, billing, and team members — the full production control plane for your AI stack.",
    bullets: [
      "Real-time cost and budget usage indicators",
      "Trace explorer with session waterfall view",
      "Alerts for budget, errors, and quality drops",
    ],
    cta: [{ label: "Try Demo", href: "#demo" }],
    code: {
      lang: "bash",
      lines: [
        "# Your first trace appears automatically",
        "open https://app.layerflow.dev",
        "",
        "# Filter traces",
        "GET /v1/traces?status=error&from=2026-07-01",
      ],
    },
  },
];

export const whyChoose = [
  {
    iconKey: "integration",
    title: "One Integration",
    desc: "Change a single import and get observability, cost control, caching, and reliability at once.",
  },
  {
    iconKey: "unlock",
    title: "No Vendor Lock-in",
    desc: "Framework-agnostic and provider-agnostic. Works with any code that calls an AI API.",
  },
  {
    iconKey: "shield",
    title: "BYOK & Private",
    desc: "Bring your own provider keys. Your prompts route through your own accounts.",
  },
  {
    iconKey: "chart",
    title: "Full Visibility",
    desc: "Complete cost and trace analytics for every request, model, key, and user.",
  },
  {
    iconKey: "zap",
    title: "Under 20ms Overhead",
    desc: "A Fastify gateway on the edge with async logging keeps the hot path fast.",
  },
  {
    iconKey: "test",
    title: "Agent Testing",
    desc: "Write test cases, run them on every commit, and catch regressions before deploy.",
  },
];

export const integrations = [
  { name: "OpenAI", src: "/images/openai.svg" },
  { name: "Anthropic", src: "/images/anthropic.svg" },
  { name: "Gemini", src: "/images/google-gemini.svg" },
  { name: "LangChain", src: "/images/langchain.svg" },
  { name: "Databricks", src: "/images/databricks.svg" },
  { name: "Vercel AI", src: "/images/vercel.svg" },
  { name: "Bedrock", src: "/images/bedrock.png" },
  { name: "LiteLLM", src: "/images/litellm.png" },
  { name: "Qwen", src: "/images/qwen-logo.png" },
];

export const steps = [
  {
    n: 1,
    title: "Install the SDK",
    desc: "One command. Drop-in replacement for your existing OpenAI client.",
    lang: "bash",
    code: ["npm install @layerflow/gateway"],
    time: "~20 seconds",
  },
  {
    n: 2,
    title: "Swap one import",
    desc: "Point your client at LayerFlow. Every call now flows through the gateway.",
    lang: "typescript",
    code: [
      "import { LayerFlow } from '@layerflow/gateway'",
      "const lf = new LayerFlow({",
      "  apiKey: process.env.LF_KEY,",
      "})",
    ],
    time: "~30 seconds",
  },
  {
    n: 3,
    title: "Run your code",
    desc: "Run as usual. Your first trace and cost appear in the dashboard instantly.",
    lang: "typescript",
    code: [
      "await lf.chat.completions.create({",
      "  model: 'gpt-4o',",
      "  messages: [{ role: 'user', content: 'Hi!' }],",
      "})",
    ],
    time: "~1 minute",
  },
];

export const stats = [
  { value: "30M+", label: "Requests proxied / month" },
  { value: "26K+", label: "GitHub stars" },
  { value: "<5ms", label: "Cache hit latency" },
  { value: "40–70%", label: "Typical cost reduction" },
];

export const faqs = [
  {
    q: "What is LayerFlow?",
    a: "LayerFlow is the production infrastructure platform for AI applications. It sits between your app and every AI provider, giving you observability, real-time cost tracking, budget enforcement, caching, reliability, and automated testing — all through a single integration.",
  },
  {
    q: "Why do I need an AI infrastructure platform?",
    a: "Once AI apps hit production, teams face black-box debugging, unpredictable costs, multi-provider maintenance, and no standard way to test agents. LayerFlow solves all of these at the network layer so you don't rebuild the same infrastructure from scratch.",
  },
  {
    q: "Is LayerFlow free?",
    a: "Yes. The Free plan includes 10,000 proxied requests per month, 7-day trace retention, the cost dashboard, and exact-match caching. Paid plans add higher limits, longer retention, team seats, and advanced features.",
  },
  {
    q: "Does LayerFlow work with my stack?",
    a: "Yes. LayerFlow is framework-agnostic and provider-agnostic. If your code makes HTTP calls to an AI API — OpenAI, Anthropic, Gemini, Groq, and more — it works, with TypeScript and Python SDKs.",
  },
  {
    q: "How does BYOK (bring your own key) work?",
    a: "You connect your own provider API keys. LayerFlow proxies calls using your keys, so your prompts route through your own accounts and you keep predictable, provider-native billing.",
  },
];

export const posts = [
  {
    date: "Jul 2, 2026",
    title: "Multi-step agents need multi-layer observability",
    tag: "Engineering",
  },
  {
    date: "Jun 15, 2026",
    title: "Manage your AI teams with role-based access control",
    tag: "Product",
  },
  {
    date: "May 25, 2026",
    title: "Route any AI coding agent through the LayerFlow Gateway",
    tag: "Tutorial",
  },
];

export const footerCols = [
  {
    title: "Platform",
    links: ["Observability", "Cost Analytics", "AI Gateway", "Caching", "Testing"],
  },
  {
    title: "Developers",
    links: ["Documentation", "SDK Reference", "API Reference", "Changelog", "Status"],
  },
  {
    title: "Company",
    links: ["About", "Blog", "Pricing", "Careers", "Contact"],
  },
  {
    title: "Community",
    links: ["GitHub", "Discord", "X / Twitter", "LinkedIn", "YouTube"],
  },
];
