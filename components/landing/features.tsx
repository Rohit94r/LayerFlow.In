import { SectionHeading } from "@/components/ui/reveal";
import {
  LifeBuoy,
  BookUser,
  FileDown,
  Wand2,
  DollarSign,
  CopyCheck,
  KeyRound,
  Cpu,
  FolderKanban,
  Search,
  Brain,
  History,
  Code2,
  TerminalSquare,
  Bot,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const FEATURES: {
  icon: LucideIcon;
  title: string;
  description: string;
  badge?: string;
}[] = [
  {
    icon: Code2,
    title: "Web Coding Workspace",
    description: "Write plain English, click Improve, and run working code in your browser — no install, no API keys, no setup.",
    badge: "New",
  },
  {
    icon: TerminalSquare,
    title: "Browser Terminal",
    description: "An opencode-style terminal that runs right in the browser. Agent output, shell commands and file diffs in one view.",
  },
  {
    icon: Bot,
    title: "Multi-Agent",
    description: "Implement, review and test agents work in parallel — each with its own model, budget and output stream.",
  },
  {
    icon: Wand2,
    title: "Plain-English Improve",
    description: "Write a vague ask, click Improve, and get a precise prompt with constraints, examples and format — scored from 0 to 100.",
  },
  {
    icon: LifeBuoy,
    title: "Limit Rescue",
    description: "Hit the ChatGPT or Claude cap? Paste the thread and keep working in another model in under a minute.",
    badge: "Hero",
  },
  {
    icon: BookUser,
    title: "Context Passport",
    description: "A portable memory package: goal, current state, decisions, constraints, failures, success, next action, output format.",
  },
  {
    icon: FileDown,
    title: "Smart Compress",
    description: "15,000 words in, ~1,000 words out. Only the useful context survives — with a clear reduction count.",
  },
  {
    icon: DollarSign,
    title: "Cost Check",
    description: "Real dollar estimates across Claude, GPT, Gemini, DeepSeek, Kimi and Groq — not just token counts.",
  },
  {
    icon: CopyCheck,
    title: "Continue Pack",
    description: "A copy-ready continuation package. Paste it into any AI and continue exactly where you stopped.",
  },
  {
    icon: KeyRound,
    title: "BYOK",
    description: "Bring your own API keys. Pay your provider's prices, keep full control, and never touch resold credits.",
  },
  {
    icon: Cpu,
    title: "Best Model Suggestion",
    description: "The right model for the task — with the reasoning explained. Cheap first, strong when it matters.",
  },
  {
    icon: FolderKanban,
    title: "Workspace",
    description: "Projects, saved context, prompt library, timeline and history — your AI work, organized and durable.",
  },
  {
    icon: Search,
    title: "Context Search",
    description: "Search every saved passport, prompt and decision. Find the answer you already paid for.",
  },
  {
    icon: Brain,
    title: "Learning Memory",
    description: "Pin what worked so future sessions start from your hard-won lessons, not from scratch.",
  },
  {
    icon: History,
    title: "AI Work Ledger",
    description: "A git-like timeline of everything done with AI: rescues, prompts, models, decisions and costs.",
  },
];

export default function Features() {
  return (
    <section id="features" className="relative py-16 sm:py-20">
      <div className="absolute inset-0 grid-lines opacity-30" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          eyebrow="Features"
          title={
            <>
              Code with AI — and keep
              <br />
              <span className="text-brand">every bit of context alive</span>
            </>
          }
          description="A coding platform, a browser terminal, and a rescue workflow for the context you've already earned. Not another chat window."
        />
      </div>

      <div className="marquee-paused relative mt-10 space-y-5">
        {[0, 1].map((row) => {
          const items = row === 0 ? FEATURES.slice(0, 8) : FEATURES.slice(8);
          return (
            <div key={row} className="overflow-hidden">
              <div
                className={`flex w-max gap-4 pr-4 sm:gap-5 sm:pr-5 ${
                  row === 0 ? "animate-marquee" : "animate-marquee-reverse"
                }`}
              >
                {[...items, ...items].map((f, i) => (
                  <div
                    key={`${f.title}-${i}`}
                    className="card card-hover group relative h-full w-[calc(100vw-2.5rem)] shrink-0 overflow-hidden p-6 sm:w-[calc((100vw-3.5rem-1.25rem)/2)] lg:w-[calc((100vw-4.5rem-2.5rem)/3)]"
                  >
                      <div
                        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
                        style={{ background: "var(--glow-amber)" }}
                        aria-hidden
                      />
                      {f.badge ? (
                        <span className="absolute right-4 top-4 rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand">
                          {f.badge}
                        </span>
                      ) : null}
                      <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface-2 text-brand transition-colors group-hover:border-brand/40">
                        <f.icon className="h-5 w-5" />
                      </div>
                      <h3 className="mt-5 text-base font-semibold text-ink">{f.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted">{f.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
    </section>
  );
}
