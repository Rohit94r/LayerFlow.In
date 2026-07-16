import {
  BookOpen,
  Linkedin,
  Youtube,
  MessageCircle,
  ArrowRight,
} from "lucide-react";
import { footerCols } from "@/lib/content";
import Logo from "./Logo";
import Reveal from "./Reveal";

const socials = [
  { icon: BookOpen, label: "Docs" },
  { icon: Linkedin, label: "LinkedIn" },
  { icon: Youtube, label: "YouTube" },
  { icon: MessageCircle, label: "Discord" },
];

export default function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-border">
      <div className="relative mx-auto max-w-7xl px-5 py-24 sm:px-8">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-sm font-medium text-brand">Start building</span>
            <h2 className="mt-3 text-4xl font-semibold text-ink sm:text-5xl">
              Ready to organize your AI workspace?
            </h2>
            <p className="mt-4 text-muted">
              Start free in minutes. Create your first prompt workspace,
              compare models, and set budget limits before your coffee gets cold.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a
                href="#demo"
                className="btn-primary group inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold"
              >
                Start for free
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
              <a
                href="#docs"
                className="inline-flex items-center gap-2 rounded-xl border border-border-strong px-6 py-3 text-sm font-semibold text-ink transition-colors hover:bg-surface-2"
              >
                Read the docs
              </a>
            </div>
          </div>
        </Reveal>

        <div className="mt-16 flex flex-wrap items-center justify-center gap-6">
          {socials.map((s) => (
            <a
              key={s.label}
              href="#"
              className="flex items-center gap-2 text-sm text-muted transition-colors hover:text-ink"
            >
              <s.icon className="h-4 w-4" />
              {s.label}
            </a>
          ))}
        </div>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:grid-cols-2 sm:px-8 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <Logo className="h-7" />
            <p className="mt-4 max-w-xs text-sm text-muted">
              The AI workspace for prompts, models, and cost management.
              Write, version, compare, and control — all in one place.
            </p>
          </div>
          {footerCols.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold text-ink">{col.title}</h4>
              <ul className="mt-4 space-y-3">
                {col.links.map((l) => (
                  <li key={l}>
                    <a
                      href="#"
                      className="text-sm text-muted transition-colors hover:text-ink"
                    >
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-5 py-6 sm:flex-row sm:px-8">
          <p className="text-sm text-faint">
            © {new Date().getFullYear()} LayerFlow · Built by Rohit Jadhav
          </p>
          <div className="flex gap-5 text-sm text-faint">
            <a href="#" className="hover:text-ink">Privacy</a>
            <a href="#" className="hover:text-ink">Terms</a>
            <a href="#" className="hover:text-ink">Security</a>
          </div>
        </div>
      </div>

      <div className="relative h-24 overflow-hidden">
        <div className="footer-glow absolute inset-x-0 bottom-[-40px] h-24 [mask-image:linear-gradient(to_top,black,transparent)]" />
      </div>
    </footer>
  );
}
