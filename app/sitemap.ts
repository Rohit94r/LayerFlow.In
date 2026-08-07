import type { MetadataRoute } from "next";
import { getPublishedPosts } from "@/lib/blog";

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
      changeFrequency: "weekly",
      priority: 0.7,
    },
  ];

  for (const post of getPublishedPosts()) {
    entries.push({
      url: `${base}/blog/${post.slug}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    });
  }

  return entries;
}
