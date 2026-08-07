import Link from "next/link";
import type { BlogPost } from "@/lib/blog/types";
import { doodleForSlug } from "@/lib/doodles";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function BlogPostRow({ post }: { post: BlogPost }) {
  return (
    <article className="group flex gap-6 border-b border-border py-8 first:pt-0">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-faint">
          <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
          <span aria-hidden>·</span>
          <Link
            href={`/blog?category=${encodeURIComponent(post.category)}`}
            className="text-brand hover:underline"
          >
            {post.category}
          </Link>
          <span aria-hidden>·</span>
          <span>{post.readingTime}</span>
        </div>
        <h2 className="mt-3 font-sans text-2xl font-semibold tracking-tight text-ink transition-colors group-hover:text-brand sm:text-3xl">
          <Link href={`/blog/${post.slug}`}>{post.title}</Link>
        </h2>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-muted sm:text-lg">
          {post.description}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {post.tags.slice(0, 3).map((tag) => (
            <Link
              key={tag}
              href={`/blog?tag=${encodeURIComponent(tag)}`}
              className="font-mono text-xs text-faint transition-colors hover:text-ink"
            >
              #{tag}
            </Link>
          ))}
        </div>
      </div>
      <Link
        href={`/blog/${post.slug}`}
        className="hidden shrink-0 overflow-hidden rounded-xl border border-border transition-colors duration-150 group-hover:border-border-strong sm:block"
        aria-label={`Read ${post.title}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={doodleForSlug(post.slug)}
          alt=""
          aria-hidden
          className="h-28 w-44 object-cover transition-transform duration-300 group-hover:scale-[1.04]"
        />
      </Link>
    </article>
  );
}
