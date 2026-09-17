import Link from "next/link";
import type { BlogPost } from "@/lib/blog/types";
import { getCategorySlug, coverImageFor } from "@/lib/blog";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function BlogPostRow({ post }: { post: BlogPost }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface/50 transition-colors duration-200 hover:border-border-strong">
      <div className="relative aspect-[16/9] overflow-hidden">
        <Link href={`/blog/${post.slug}`} aria-label={`Read ${post.title}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverImageFor(post)}
            alt={post.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
          />
        </Link>
        <Link
          href={`/blog/category/${getCategorySlug(post.category)}`}
          className="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white backdrop-blur transition-colors hover:bg-black/80"
        >
          {post.category}
        </Link>
      </div>
      <div className="flex flex-1 flex-col p-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-faint">
          <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
          <span aria-hidden>·</span>
          <span>{post.readingTime}</span>
        </div>
        <h2 className="mt-3 font-sans text-xl font-semibold tracking-tight text-ink transition-colors group-hover:text-brand">
          <Link href={`/blog/${post.slug}`}>{post.title}</Link>
        </h2>
        <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-muted">
          {post.description}
        </p>
        <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
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
    </article>
  );
}