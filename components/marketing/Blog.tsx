import { ArrowUpRight } from "lucide-react";
import { posts } from "@/lib/marketing-content";
import Reveal from "./Reveal";

export default function Blog() {
  return (
    <section id="blog" className="mx-auto max-w-7xl scroll-mt-24 px-5 py-20 sm:px-8 sm:py-24">
      <Reveal>
        <div className="flex items-end justify-between gap-4">
          <div>
            <span className="text-sm font-medium text-brand">Blog</span>
            <h2 className="mt-2 text-3xl font-semibold text-ink sm:text-4xl">
              Latest news
            </h2>
          </div>
          <a
            href="#blog"
            className="rounded-lg border border-border-strong px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface-2"
          >
            View all
          </a>
        </div>
      </Reveal>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {posts.map((p, i) => (
          <Reveal key={p.title} delay={i * 0.08}>
            <a
              href="#blog"
              className="card card-hover group flex h-full flex-col overflow-hidden"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-crimson/30 via-brand-2/25 to-brand/30">
                <div className="absolute inset-0 grid-lines opacity-60" />
                <span className="glass-pill absolute left-4 top-4 rounded-full px-3 py-1 text-xs text-white/90">
                  {p.tag}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <span className="text-xs text-faint">{p.date}</span>
                <h3 className="mt-2 flex items-start justify-between gap-2 text-base font-semibold text-ink">
                  {p.title}
                  <ArrowUpRight className="h-4 w-4 flex-none text-faint transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink" />
                </h3>
              </div>
            </a>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
