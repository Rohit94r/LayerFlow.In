import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import BlogHero from "@/components/blog/BlogHero";
import BlogFilters from "@/components/blog/BlogFilters";
import BlogPostRow from "@/components/blog/BlogPostRow";
import {
  getPublishedPosts,
  getCategories,
  getTags,
  SITE_URL,
} from "@/lib/blog";

/** Unlock scheduled posts without a full redeploy (checks publishedAt on each revalidate) */
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Guides on AI prompt management, LLM cost control, multi-model comparison, BYOK, and OpenAI-compatible gateways from LayerFlow.",
  alternates: { canonical: "/blog" },
  openGraph: {
    url: "/blog",
    title: "LayerFlow Blog — Prompts, Models, and Cost",
    description:
      "Practical guides for prompt workspaces, budgets, compare, and AI gateways.",
  },
};

type SearchParams = Promise<{ category?: string; tag?: string }>;

export default async function BlogIndexPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { category, tag } = await searchParams;
  let posts = getPublishedPosts();

  if (category) {
    posts = posts.filter((p) => p.category === category);
  }
  if (tag) {
    const needle = tag.toLowerCase();
    posts = posts.filter((p) =>
      p.tags.some((t) => t.toLowerCase() === needle),
    );
  }

  const categories = getCategories();
  const tags = getTags();

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "LayerFlow Blog",
    url: `${SITE_URL}/blog`,
    description:
      "Guides on AI prompt management, LLM cost control, multi-model comparison, and gateways.",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />
      <BlogHero />
      <div className="mx-auto max-w-7xl px-6 py-12 sm:px-8 sm:py-16">
        <Suspense
          fallback={
            <div className="mb-8 h-20 animate-pulse rounded-xl bg-surface-2" />
          }
        >
          <BlogFilters categories={categories} tags={tags} />
        </Suspense>

        <div className="mt-4">
          {posts.length === 0 ? (
            <p className="py-16 text-muted">
              No posts match this filter.{" "}
              <Link href="/blog" className="text-brand hover:underline">
                View all
              </Link>
            </p>
          ) : (
            posts.map((post) => <BlogPostRow key={post.slug} post={post} />)
          )}
        </div>
      </div>
    </>
  );
}
