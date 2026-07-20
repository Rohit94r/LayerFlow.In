import type { BlogPost, BlogPostMeta } from "./types";
import { posts } from "@/content/blog/posts";

export type { BlogPost, BlogPostMeta, BlogBlock, BlogCategory } from "./types";
export { keywordClusters, allKeywords, categoryKeywordFocus } from "./keywords";

const bySlug = new Map(posts.map((p) => [p.slug, p]));

export function getAllPosts(): BlogPost[] {
  return [...posts].sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  return bySlug.get(slug);
}

export function getAllSlugs(): string[] {
  return posts.map((p) => p.slug);
}

export function getPostsByCategory(category: string): BlogPost[] {
  return getAllPosts().filter((p) => p.category === category);
}

export function getPostsByTag(tag: string): BlogPost[] {
  const needle = tag.toLowerCase();
  return getAllPosts().filter((p) =>
    p.tags.some((t) => t.toLowerCase() === needle),
  );
}

export function getRelatedPosts(post: BlogPost, limit = 3): BlogPost[] {
  const related = post.relatedSlugs
    .map((s) => bySlug.get(s))
    .filter((p): p is BlogPost => Boolean(p));

  if (related.length >= limit) return related.slice(0, limit);

  const extras = getAllPosts().filter(
    (p) =>
      p.slug !== post.slug &&
      !related.some((r) => r.slug === p.slug) &&
      (p.category === post.category ||
        p.tags.some((t) => post.tags.includes(t))),
  );

  return [...related, ...extras].slice(0, limit);
}

export function getCategories(): string[] {
  return [...new Set(posts.map((p) => p.category))];
}

export function getTags(): string[] {
  return [...new Set(posts.flatMap((p) => p.tags))].sort();
}

export function toMeta(post: BlogPost): BlogPostMeta {
  const { blocks: _, ...meta } = post;
  return meta;
}

export function estimateWordCount(post: BlogPost): number {
  return post.blocks.reduce((sum, block) => {
    if (block.type === "p" || block.type === "h2" || block.type === "h3" || block.type === "callout") {
      return sum + block.text.split(/\s+/).length;
    }
    if (block.type === "ul" || block.type === "ol") {
      return sum + block.items.join(" ").split(/\s+/).length;
    }
    if (block.type === "faq") {
      return (
        sum +
        block.items.reduce(
          (n, item) => n + item.q.split(/\s+/).length + item.a.split(/\s+/).length,
          0,
        )
      );
    }
    return sum;
  }, 0);
}

export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export const SITE_URL = "https://layerflow.dev";
export const BLOG_AUTHOR = "LayerFlow Team";
