import Link from "next/link";
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
      { label: "Docs", href: "/docs" },
      { label: "Install CLI", href: "/docs#install" },
      { label: "Engineering", href: "/docs#architecture" },
      { label: "Sign in", href: "/sign-in" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-border bg-surface/40">
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
              {site.tagline}. Code in your browser or terminal — write plain
              English, click Improve, and run multi-agent sessions. Rescue dead
              chats into Context Passports and continue in any model.
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

        <div className="mt-10 border-t border-border pt-6 text-center text-xs text-faint">
          Code with AI. Never lose context.
        </div>
      </div>

      <div className="relative mx-auto w-full select-none pb-8 pt-6 sm:pb-10">
        <p
          aria-hidden
          className="absolute inset-0 whitespace-nowrap bg-gradient-to-b from-brand/60 to-brand/20 bg-clip-text text-center font-mono font-medium leading-none tracking-tight text-transparent blur-[28px] [font-size:clamp(2.4rem,11vw,13rem)]"
        >
          LayerFlow.dev
        </p>
        <p className="relative whitespace-nowrap bg-gradient-to-b from-brand to-brand/40 bg-clip-text text-center font-mono font-medium leading-none tracking-tight text-transparent [font-size:clamp(2.4rem,11vw,13rem)]">
          LayerFlow.dev
        </p>
      </div>
    </footer>
  );
}
