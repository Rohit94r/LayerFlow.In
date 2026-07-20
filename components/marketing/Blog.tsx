import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { getAllPosts } from "@/lib/blog";
import Reveal from "./Reveal";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function Blog() {
  const posts = getAllPosts().slice(0, 3);

  return (
    <section id="blog" className="mx-auto max-w-7xl scroll-mt-24 px-5 py-20 sm:px-8 sm:py-24">
      <Reveal>
        <div className="flex items-end justify-between gap-4">
          <div>
            <span className="text-sm font-medium text-brand">Blog</span>
            <h2 className="mt-2 text-3xl font-semibold text-ink sm:text-4xl">
              Latest from LayerFlow
            </h2>
          </div>
          <Link
            href="/blog"
            className="rounded-lg border border-border-strong px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface-2"
          >
            View all
          </Link>
        </div>
      </Reveal>

      <div className="mt-10 divide-y divide-border border-t border-border">
        {posts.map((p, i) => (
          <Reveal key={p.slug} delay={i * 0.08}>
            <Link
              href={`/blog/${p.slug}`}
              className="group flex flex-col gap-2 py-6 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-3 text-xs text-faint">
                  <time dateTime={p.publishedAt}>{formatDate(p.publishedAt)}</time>
                  <span>{p.category}</span>
                </div>
                <h3 className="mt-2 flex items-start gap-2 text-lg font-semibold text-ink transition-colors group-hover:text-brand sm:text-xl">
                  <span className="min-w-0">{p.title}</span>
                  <ArrowUpRight className="mt-1 h-4 w-4 flex-none text-faint transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink" />
                </h3>
              </div>
              <p className="max-w-md shrink-0 text-sm text-muted sm:text-right">
                {p.description}
              </p>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
