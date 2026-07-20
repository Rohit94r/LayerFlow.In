import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import BlogContent from "@/components/blog/BlogContent";
import BlogTOC from "@/components/blog/BlogTOC";
import RelatedPosts from "@/components/blog/RelatedPosts";
import {
  getAllSlugs,
  getPostBySlug,
  getRelatedPosts,
  SITE_URL,
} from "@/lib/blog";

type Params = Promise<{ slug: string }>;

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};

  const url = `/blog/${post.slug}`;
  return {
    title: post.metaTitle,
    description: post.description,
    keywords: [post.primaryKeyword, ...post.secondaryKeywords, ...post.tags],
    authors: [{ name: post.author }],
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title: post.metaTitle,
      description: post.description,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt ?? post.publishedAt,
      authors: [post.author],
      tags: post.tags,
    },
    twitter: {
      card: "summary_large_image",
      title: post.metaTitle,
      description: post.description,
    },
  };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default async function BlogPostPage({ params }: { params: Params }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const related = getRelatedPosts(post, 3);
  const tocItems = post.blocks
    .filter(
      (b): b is Extract<typeof b, { type: "h2" | "h3" }> =>
        b.type === "h2" || b.type === "h3",
    )
    .map((b) => ({
      id: b.id,
      text: b.text,
      level: (b.type === "h2" ? 2 : 3) as 2 | 3,
    }));

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt ?? post.publishedAt,
    author: {
      "@type": "Organization",
      name: post.author,
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: "LayerFlow",
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/og.png`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${SITE_URL}/blog/${post.slug}`,
    },
    keywords: [post.primaryKeyword, ...post.secondaryKeywords].join(", "),
  };

  const faqBlock = post.blocks.find((b) => b.type === "faq");
  const faqJsonLd =
    faqBlock && faqBlock.type === "faq"
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqBlock.items.map((item) => ({
            "@type": "Question",
            name: item.q,
            acceptedAnswer: {
              "@type": "Answer",
              text: item.a.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1"),
            },
          })),
        }
      : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      {faqJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      ) : null}

      <article className="mx-auto max-w-7xl px-6 pb-24 pt-32 sm:px-8">
        <header className="mx-auto max-w-3xl">
          <nav className="text-sm text-faint">
            <Link href="/blog" className="hover:text-ink">
              Blog
            </Link>
            <span className="mx-2">/</span>
            <span className="text-muted">{post.category}</span>
          </nav>
          <h1 className="mt-4 font-sans text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
            {post.title}
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-muted">
            {post.description}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border pb-8 text-sm text-faint">
            <span>{post.author}</span>
            <span aria-hidden>·</span>
            <time dateTime={post.publishedAt}>
              {formatDate(post.publishedAt)}
            </time>
            <span aria-hidden>·</span>
            <span>{post.readingTime}</span>
          </div>
        </header>

        <div className="mx-auto mt-10 grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,1fr)_240px]">
          <div className="min-w-0 lg:order-1">
            <BlogContent blocks={post.blocks} />
            <RelatedPosts posts={related} />
            <div className="mt-12 rounded-2xl border border-border bg-surface/50 p-8 text-center">
              <p className="font-mono text-sm text-brand">LayerFlow</p>
              <h2 className="mt-2 text-2xl font-semibold text-ink">
                Try the AI workspace
              </h2>
              <p className="mx-auto mt-3 max-w-md text-muted">
                Save prompts, compare models, and set hard budgets in one place.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link
                  href="/sign-in"
                  className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black transition-transform hover:scale-[1.02]"
                >
                  Sign in
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
          <aside className="lg:order-2">
            <BlogTOC items={tocItems} />
          </aside>
        </div>
      </article>
    </>
  );
}
