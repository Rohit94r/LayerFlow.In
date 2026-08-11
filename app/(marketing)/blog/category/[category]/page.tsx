import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import BlogPostRow from "@/components/blog/BlogPostRow";
import {
  getCategoryBySlug,
  getCategories,
  getCategorySlug,
  getPublishedPosts,
  categoryMeta,
  SITE_URL,
} from "@/lib/blog";

/** Unlock scheduled posts without a full redeploy */
export const revalidate = 3600;

type Params = Promise<{ category: string }>;

export function generateStaticParams() {
  return Object.values(categoryMeta).map((c) => ({ category: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { category } = await params;
  const meta = getCategoryBySlug(category);
  if (!meta) return { robots: { index: false, follow: false } };

  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: `/blog/category/${meta.slug}` },
    openGraph: {
      url: `/blog/category/${meta.slug}`,
      title: meta.title,
      description: meta.description,
      type: "website",
    },
  };
}

export default async function BlogCategoryPage({
  params,
}: {
  params: Params;
}) {
  const { category } = await params;
  const meta = getCategoryBySlug(category);
  if (!meta) notFound();

  const allPosts = getPublishedPosts();
  const categoryPosts = allPosts.filter(
    (p) => categoryMeta[p.category]?.slug === meta.slug,
  );
  const otherCategories = getCategories().filter(
    (c) => categoryMeta[c]?.slug !== meta.slug,
  );

  const categoryPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: meta.title,
    url: `${SITE_URL}/blog/category/${meta.slug}`,
    description: meta.description,
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Blog",
        item: `${SITE_URL}/blog`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: meta.h1,
        item: `${SITE_URL}/blog/category/${meta.slug}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(categoryPageJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <section className="relative overflow-hidden border-b border-border">
        <div className="relative mx-auto max-w-7xl px-6 pb-12 pt-32 sm:px-8 sm:pb-16 sm:pt-36">
          <nav className="text-sm text-faint" aria-label="Breadcrumb">
            <Link href="/blog" className="hover:text-ink">
              Blog
            </Link>
            <span className="mx-2">/</span>
            <span className="text-muted">{meta.slug}</span>
          </nav>
          <h1 className="mt-4 max-w-3xl font-sans text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
            {meta.h1}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
            {meta.description}
          </p>
          <nav aria-label="Other blog categories" className="mt-6 flex flex-wrap gap-2">
            {otherCategories.map((c) => (
              <Link
                key={c}
                href={`/blog/category/${categoryMeta[c]?.slug ?? getCategorySlug(c)}`}
                className="rounded-full border border-border-strong bg-surface/50 px-3.5 py-1.5 text-sm font-medium text-muted transition-colors hover:border-brand/60 hover:text-ink"
              >
                {c}
              </Link>
            ))}
          </nav>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-6 py-12 sm:px-8 sm:py-16">
        {categoryPosts.length === 0 ? (
          <p className="py-16 text-muted">
            No posts published in this category yet.{" "}
            <Link href="/blog" className="text-brand hover:underline">
              View all
            </Link>
          </p>
        ) : (
          categoryPosts.map((post) => (
            <BlogPostRow key={post.slug} post={post} />
          ))
        )}
        <div className="mt-12 rounded-2xl border border-border bg-surface/50 p-8 text-center">
          <p className="font-mono text-sm text-brand">LayerFlow</p>
          <h2 className="mt-2 text-2xl font-semibold text-ink">
            Put these guides to work
          </h2>
          <p className="mx-auto mt-3 max-w-md text-muted">
            Save prompts, compare models, and set hard budgets in one workspace.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/sign-in"
              className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black transition-transform hover:scale-[1.02]"
            >
              Open workspace
            </Link>
            <Link
              href="/pricing"
              className="rounded-xl border border-border-strong px-5 py-2.5 text-sm font-semibold text-ink hover:bg-surface-2"
            >
              Pricing
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
