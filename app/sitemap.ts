import type { MetadataRoute } from "next";
import { getPublishedPosts, categoryMeta } from "@/lib/blog";

export const revalidate = 3600;

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://layerflow.dev";
  const now = new Date();

  const entries: MetadataRoute.Sitemap = [
    {
      url: base,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${base}/pricing`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${base}/blog`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.7,
    },
  ];

  for (const meta of Object.values(categoryMeta)) {
    entries.push({
      url: `${base}/blog/category/${meta.slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    });
  }

  for (const post of getPublishedPosts()) {
    entries.push({
      url: `${base}/blog/${post.slug}`,
      lastModified: post.updatedAt ?? post.publishedAt,
      changeFrequency: "monthly",
      priority: 0.6,
    });
  }

  return entries;
}
