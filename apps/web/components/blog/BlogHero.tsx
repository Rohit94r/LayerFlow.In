import Link from "next/link";

export default function BlogHero() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(245,158,11,0.12),transparent_50%),radial-gradient(ellipse_at_90%_20%,rgba(68,237,188,0.08),transparent_45%)]"
      />
      <div className="relative mx-auto max-w-7xl px-6 pb-16 pt-32 sm:px-8 sm:pb-20 sm:pt-36">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/doodles/reading-side.svg"
          alt=""
          aria-hidden
          className="pointer-events-none absolute -right-8 top-28 hidden w-64 select-none opacity-90 lg:block"
        />
        <p className="font-mono text-sm font-medium tracking-wide text-brand">
          LayerFlow Blog
        </p>
        <h1 className="mt-4 max-w-3xl font-sans text-4xl font-semibold tracking-tight text-ink sm:text-5xl lg:text-6xl">
          AI prompt guides: organization, model comparison, and cost control
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
          Practical, SEO-ready guides on organizing AI prompts, comparing
          LLMs side by side, routing models for cost and quality, BYOK key
          management, and building AI workspaces.
        </p>
        <nav aria-label="Blog topics" className="mt-6 flex flex-wrap gap-2">
          {[
            { label: "Prompt engineering", href: "/blog/category/prompt-engineering" },
            { label: "Cost control", href: "/blog/category/cost-control" },
            { label: "Model comparison", href: "/blog/category/model-comparison" },
            { label: "AI gateway", href: "/blog/category/ai-gateway" },
            { label: "Getting started", href: "/blog/category/getting-started" },
          ].map((topic) => (
            <Link
              key={topic.href}
              href={topic.href}
              className="rounded-full border border-border-strong bg-surface/50 px-3.5 py-1.5 text-sm font-medium text-muted transition-colors hover:border-brand/60 hover:text-ink"
            >
              {topic.label}
            </Link>
          ))}
        </nav>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/sign-in"
            className="inline-flex items-center rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black transition-transform hover:scale-[1.02]"
          >
            Open workspace
          </Link>
          <Link
            href="/docs"
            className="inline-flex items-center rounded-xl border border-border-strong px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-surface-2"
          >
            Read docs
          </Link>
        </div>
      </div>
    </section>
  );
}
