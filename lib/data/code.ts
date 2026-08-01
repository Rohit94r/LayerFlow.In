export type CodeFile = {
  name: string;
  type: "file" | "folder";
  children?: CodeFile[];
  language?: string;
  content?: string;
};

export const CODE_TREE: CodeFile[] = [
  {
    name: "landing-page",
    type: "folder",
    children: [
      { name: "src", type: "folder", children: [
        { name: "app", type: "folder", children: [
          { name: "layout.tsx", type: "file", language: "tsx", content: "export default function RootLayout({ children }) {\n  return <html>{children}</html>;\n}" },
          { name: "page.tsx", type: "file", language: "tsx", content: "export default function Home() {\n  return <main>Hello LayerFlow</main>;\n}" },
        ] },
        { name: "components", type: "folder", children: [
          { name: "hero.tsx", type: "file", language: "tsx", content: "export function Hero() {\n  return <section>Hero copy</section>;\n}" },
        ] },
      ] },
      { name: "package.json", type: "file", language: "json", content: "{\n  \"name\": \"landing-page\",\n  \"scripts\": { \"dev\": \"next dev\" }\n}" },
      { name: "README.md", type: "file", language: "md", content: "# Landing page\nBuilt with LayerFlow agents." },
    ],
  },
];

export type AgentStatus = "idle" | "running" | "done" | "reviewing";

export type Agent = {
  id: string;
  name: string;
  role: "implement" | "review" | "test";
  model: string;
  status: AgentStatus;
  detail: string;
};

export const AGENTS: Agent[] = [
  {
    id: "agent-implement",
    name: "Implement",
    role: "implement",
    model: "gpt-4.1",
    status: "running",
    detail: "Editing src/app/page.tsx · hero section",
  },
  {
    id: "agent-review",
    name: "Review",
    role: "review",
    model: "claude-sonnet-4",
    status: "reviewing",
    detail: "Checking diff for DX and a11y",
  },
  {
    id: "agent-test",
    name: "Test",
    role: "test",
    model: "gemini-flash",
    status: "idle",
    detail: "Waiting for implement to finish",
  },
];

export const IMPROVED_PROMPT_EXAMPLE = {
  original: "build me a landing page",
  improved:
    "Create a high-converting SaaS landing page for an AI coding platform called LayerFlow. Requirements:\n1. Hero with headline + two CTAs (primary: Start coding, secondary: Try the terminal)\n2. Feature grid with 6 cards (web coding workspace, browser terminal, multi-agent, prompt improver, cost check, BYOK)\n3. Dark theme with orange accent (#f97316), Geist font, responsive\n4. Sections: hero, features, how-it-works, pricing, FAQ\nOutput: Next.js + Tailwind + framer-motion. Keep bundle small, no external images.",
  score: 92,
  reasons: [
    "Added concrete product details instead of vague 'landing page'",
    "Specified sections, theme, fonts, and accent color",
    "Defined the stack (Next.js + Tailwind) and output expectations",
  ],
};

export type TerminalLine = {
  id: number;
  type: "cmd" | "out" | "info" | "ok" | "err";
  text: string;
};

export const TERMINAL_BOOT: TerminalLine[] = [
  { id: 1, type: "info", text: "LayerFlow agent runtime v0.4.1 — connected" },
  { id: 2, type: "cmd", text: "lf run \"build a landing page\"" },
  { id: 3, type: "out", text: "✓ prompt improved (92/100) — 3 issues fixed" },
  { id: 4, type: "out", text: "✓ model picked: gpt-4.1 ($0.09 est.)" },
  { id: 5, type: "info", text: "implement agent started · 3 files to touch" },
];
