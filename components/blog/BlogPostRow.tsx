import Link from "next/link";
import type { BlogPost } from "@/lib/blog/types";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function BlogPostRow({ post }: { post: BlogPost }) {
  return (
    <article className="group border-b border-border py-8 first:pt-0">
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
    </article>
  );
}
