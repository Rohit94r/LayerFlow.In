import Link from "next/link";
import { Wordmark } from "@/components/ui/logo";
import { site } from "@/lib/data/marketing";

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/#features" },
      { label: "How it works", href: "/#how-it-works" },
      { label: "Comparison", href: "/#comparison" },
      { label: "Pricing", href: "/pricing" },
      { label: "Roadmap", href: "/#roadmap" },
    ],
  },
  {
    title: "Use cases",
    links: [
      { label: "Limit Rescue", href: "/#use-cases" },
      { label: "Cost Check", href: "/#features" },
      { label: "Improve Prompt", href: "/rescue?mode=prompt" },
      { label: "BYOK", href: "/#features" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Docs", href: "/docs/alltechuse.md" },
      { label: "Engineering", href: "/docs/workflow.md" },
      { label: "Sign in", href: "/sign-in" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-border bg-surface/40">
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Wordmark />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
              {site.tagline}. Paste any AI conversation — compress it into a
              reusable Context Passport and continue in any model.
            </p>
            <p className="mt-5 text-xs text-faint">
              © {new Date().getFullYear()} LayerFlow. Built for people who never
              want to re-explain their work to an AI again.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="text-xs font-bold uppercase tracking-widest text-faint">{col.title}</h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-sm text-muted transition-colors hover:text-ink"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 text-xs text-faint sm:flex-row">
          <span>Never lose AI context again.</span>
          <div className="flex items-center gap-6">
            <span>ChatGPT · Claude · Gemini · DeepSeek · Kimi · Groq</span>
          </div>
        </div>

        <div className="pointer-events-none mt-12 select-none overflow-hidden" aria-hidden>
          <p className="bg-gradient-to-b from-brand via-brand/70 to-brand/10 bg-clip-text text-center text-[clamp(3rem,14vw,15rem)] font-black leading-[0.85] tracking-[-0.045em] text-transparent">
            LayerFlow.dev
          </p>
        </div>
      </div>
    </footer>
  );
}
