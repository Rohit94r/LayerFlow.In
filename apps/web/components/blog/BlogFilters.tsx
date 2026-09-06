"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getCategorySlug } from "@/lib/blog";

export default function BlogFilters({
  categories,
  tags,
}: {
  categories: string[];
  tags: string[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const activeCategory = params.get("category") ?? "";
  const activeTag = params.get("tag") ?? "";

  const setFilter = (key: "category" | "tag", value: string) => {
    const next = new URLSearchParams();
    if (key === "category" && value) next.set("category", value);
    if (key === "tag" && value) next.set("tag", value);
    // Keep only one filter type at a time for simplicity
    const qs = next.toString();
    router.push(qs ? `/blog?${qs}` : "/blog");
  };

  const categoryLink = (cat: string) => `/blog/category/${getCategorySlug(cat)}`;

  return (
    <div className="flex flex-col gap-4 border-b border-border pb-8">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 font-mono text-xs uppercase tracking-wider text-faint">
          Category
        </span>
        <button
          type="button"
          onClick={() => setFilter("category", "")}
          className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
            !activeCategory && !activeTag
              ? "bg-ink text-[var(--btn-primary-fg)]"
              : "border border-border text-muted hover:border-border-strong hover:text-ink"
          }`}
        >
          All
        </button>
        {categories.map((cat) => (
          <Link
            key={cat}
            href={categoryLink(cat)}
            className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
              activeCategory === cat
                ? "bg-ink text-[var(--btn-primary-fg)]"
                : "border border-border text-muted hover:border-border-strong hover:text-ink"
            }`}
          >
            {cat}
          </Link>
        ))}
      </div>
      {activeTag ? (
        <p className="text-sm text-muted">
          Filtered by tag{" "}
          <span className="font-mono text-ink">#{activeTag}</span>{" "}
          <Link href="/blog" className="text-brand hover:underline">
            Clear
          </Link>
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {tags.slice(0, 12).map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => setFilter("tag", tag)}
            className={`font-mono text-xs transition-colors ${
              activeTag === tag ? "text-brand" : "text-faint hover:text-ink"
            }`}
          >
            #{tag}
          </button>
        ))}
      </div>
    </div>
  );
}
