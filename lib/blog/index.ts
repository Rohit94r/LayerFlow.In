import type { BlogPost, BlogPostMeta, BlogPublishStatus } from "./types";
import { posts as rawPosts } from "@/content/blog/posts";
import {
  scheduledPublishDate,
  toBlogDateString,
} from "@/content/blog/publish-schedule";

export type { BlogPost, BlogPostMeta, BlogBlock, BlogCategory, BlogPublishStatus } from "./types";
export { keywordClusters, allKeywords, categoryKeywordFocus } from "./keywords";
export {
  BLOG_SCHEDULE_START,
  BLOG_TZ,
  publishOrder,
  scheduledPublishDate,
  getPublishScheduleMap,
  toBlogDateString,
} from "@/content/blog/publish-schedule";

function applySchedule(post: BlogPost): BlogPost {
  const scheduled = scheduledPublishDate(post.slug);
  if (!scheduled) {
    return {
      ...post,
      status: post.status ?? deriveStatus(post.publishedAt),
    };
  }
  return {
    ...post,
    publishedAt: scheduled,
    status: deriveStatus(scheduled),
  };
}

function deriveStatus(
  publishedAt: string,
  now: Date = new Date(),
): BlogPublishStatus {
  return isPublishedAt(publishedAt, now) ? "published" : "scheduled";
}

/** True when publishedAt calendar day (YYYY-MM-DD) is on or before editorial “today” */
export function isPublishedAt(
  publishedAt: string,
  now: Date = new Date(),
): boolean {
  const pubDay = publishedAt.slice(0, 10);
  return pubDay <= toBlogDateString(now);
}

export function isPostPublished(
  post: BlogPost,
  now: Date = new Date(),
): boolean {
  if (post.status === "draft") return false;
  if (post.status === "published") return isPublishedAt(post.publishedAt, now);
  if (post.status === "scheduled") return isPublishedAt(post.publishedAt, now);
  return isPublishedAt(post.publishedAt, now);
}

/** All posts with schedule overlay applied (includes future/scheduled) */
const posts: BlogPost[] = rawPosts.map(applySchedule);

const bySlug = new Map(posts.map((p) => [p.slug, p]));

function sortByPublishedDesc(a: BlogPost, b: BlogPost): number {
  return (
    new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}

/** All corpus posts (scheduled + published). Prefer getPublishedPosts for public UI. */
export function getAllPosts(): BlogPost[] {
  return [...posts].sort(sortByPublishedDesc);
}

/**
 * Posts that are live as of `now` (publishedAt <= today in BLOG_TZ,
 * and status is not draft).
 */
export function getPublishedPosts(now: Date = new Date()): BlogPost[] {
  return posts.filter((p) => isPostPublished(p, now)).sort(sortByPublishedDesc);
}

/** Raw lookup including unpublished — use getPublishedPostBySlug for public pages */
export function getPostBySlug(slug: string): BlogPost | undefined {
  return bySlug.get(slug);
}

export function getPublishedPostBySlug(
  slug: string,
  now: Date = new Date(),
): BlogPost | undefined {
  const post = bySlug.get(slug);
  if (!post || !isPostPublished(post, now)) return undefined;
  return post;
}

/** All slugs (for generateStaticParams — unpublished URLs 404 until live) */
export function getAllSlugs(): string[] {
  return posts.map((p) => p.slug);
}

export function getPublishedSlugs(now: Date = new Date()): string[] {
  return getPublishedPosts(now).map((p) => p.slug);
}

export function getPostsByCategory(category: string): BlogPost[] {
  return getPublishedPosts().filter((p) => p.category === category);
}

export function getPostsByTag(tag: string): BlogPost[] {
  const needle = tag.toLowerCase();
  return getPublishedPosts().filter((p) =>
    p.tags.some((t) => t.toLowerCase() === needle),
  );
}

export function getRelatedPosts(post: BlogPost, limit = 3): BlogPost[] {
  const related = post.relatedSlugs
    .map((s) => getPublishedPostBySlug(s))
    .filter((p): p is BlogPost => Boolean(p));

  if (related.length >= limit) return related.slice(0, limit);

  const extras = getPublishedPosts().filter(
    (p) =>
      p.slug !== post.slug &&
      !related.some((r) => r.slug === p.slug) &&
      (p.category === post.category ||
        p.tags.some((t) => post.tags.includes(t))),
  );

  return [...related, ...extras].slice(0, limit);
}

export function getCategories(): string[] {
  return [...new Set(getPublishedPosts().map((p) => p.category))];
}

export function getTags(): string[] {
  return [...new Set(getPublishedPosts().flatMap((p) => p.tags))].sort();
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
