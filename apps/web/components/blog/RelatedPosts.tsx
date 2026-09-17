import Link from "next/link";
import type { BlogPost } from "@/lib/blog/types";
import { coverImageFor } from "@/lib/blog";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function RelatedPosts({ posts }: { posts: BlogPost[] }) {
  if (!posts.length) return null;

  return (
    <section className="mt-16 border-t border-border pt-12">
      <h2 className="font-sans text-2xl font-semibold text-ink">Related posts</h2>
      <div className="mt-6 grid gap-6 md:grid-cols-3">
        {posts.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="group flex flex-col overflow-hidden rounded-xl border border-border bg-surface/40 transition-colors hover:border-border-strong"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverImageFor(post)}
              alt={post.title}
              className="aspect-[16/9] w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
            <div className="flex flex-1 flex-col p-5">
              <p className="text-xs text-faint">
                {formatDate(post.publishedAt)} · {post.category}
              </p>
              <span className="mt-2 block text-base font-semibold text-ink transition-colors group-hover:text-brand">
                {post.title}
              </span>
              <p className="mt-2 line-clamp-2 flex-1 text-sm text-muted">
                {post.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
