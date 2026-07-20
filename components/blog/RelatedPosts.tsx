import Link from "next/link";
import type { BlogPost } from "@/lib/blog/types";

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
      <ul className="mt-6 space-y-6">
        {posts.map((post) => (
          <li key={post.slug}>
            <p className="text-sm text-faint">
              {formatDate(post.publishedAt)} · {post.category}
            </p>
            <Link
              href={`/blog/${post.slug}`}
              className="mt-1 block text-lg font-semibold text-ink transition-colors hover:text-brand"
            >
              {post.title}
            </Link>
            <p className="mt-1 text-sm text-muted">{post.description}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
