import Link from "next/link";

export default function BlogHero() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(245,158,11,0.12),transparent_50%),radial-gradient(ellipse_at_90%_20%,rgba(68,237,188,0.08),transparent_45%)]"
      />
      <div className="relative mx-auto max-w-7xl px-6 pb-16 pt-32 sm:px-8 sm:pb-20 sm:pt-36">
        <p className="font-mono text-sm font-medium tracking-wide text-brand">
          LayerFlow Blog
        </p>
        <h1 className="mt-4 max-w-3xl font-sans text-4xl font-semibold tracking-tight text-ink sm:text-5xl lg:text-6xl">
          Guides for prompts, models, and cost
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
          Practical SEO-ready writing on prompt workspaces, LLM budgets,
          multi-model compare, BYOK, and gateway workflows.
        </p>
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
