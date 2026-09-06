import Link from "next/link";
import { Call, Globe, Instagram, Linkedin, Mail, Twitter } from "@/components/ui/icons";
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

const CONNECT: { label: string; href: string; icon: typeof Mail; external?: boolean }[] = [
  { label: "dev.by.rohit@gmail.com", href: "mailto:dev.by.rohit@gmail.com", icon: Mail, external: true },
  { label: "Instagram", href: "https://www.instagram.com/dev.by.rohit/", icon: Instagram, external: true },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/rohit-jadhav94/", icon: Linkedin, external: true },
  { label: "Portfolio", href: "https://www.rohitjadhav.online/", icon: Globe, external: true },
  { label: "X (Twitter)", href: "https://x.com/RohitJadhav9409", icon: Twitter, external: true },
  { label: "+91 84592 62203", href: "tel:+918459262203", icon: Call, external: true },
];

const WORD = "LayerFlow.dev";

export default function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-border bg-surface/40">
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1.1fr]">
          <div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
              {site.tagline}. Code in your browser or the CLI — write plain
              English, click Improve, and run multi-agent sessions. Rescue dead
              chats into AI summaries and continue in any model.
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

          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-faint">Connect</h3>
            <ul className="mt-4 space-y-2.5">
              {CONNECT.map((l) => (
                <li key={l.label}>
                  <a
                    href={l.href}
                    target={l.external ? "_blank" : undefined}
                    rel={l.external ? "noopener noreferrer" : undefined}
                    className="inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-ink"
                  >
                    <l.icon className="h-4 w-4 shrink-0 text-faint" />
                    <span className="truncate">{l.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-border pt-6 text-center text-xs text-faint">
          Code with AI. Never lose context.
        </div>
      </div>

      <div className="relative mx-auto w-full select-none pb-8 pt-6 sm:pb-10">
        <p className="whitespace-nowrap text-center font-mono font-medium leading-none tracking-tight [font-size:clamp(2.4rem,11vw,13rem)]">
          {WORD.split("").map((ch, i) => (
            <span
              key={i}
              className="inline-block cursor-default bg-gradient-to-b from-brand to-brand/50 bg-clip-text text-transparent transition-transform duration-200 ease-out hover:scale-[1.3] hover:drop-shadow-[0_0_18px_rgba(249,115,22,0.55)] will-change-transform"
            >
              {ch}
            </span>
          ))}
        </p>
      </div>
    </footer>
  );
}
