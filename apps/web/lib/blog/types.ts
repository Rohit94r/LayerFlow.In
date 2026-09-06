export type BlogCategory =
  | "Prompt engineering"
  | "Cost control"
  | "Model comparison"
  | "AI gateway"
  | "Productivity"
  | "Getting started"
  | "Use cases";

export type BlogBlock =
  | { type: "p"; text: string }
  | { type: "h2"; id: string; text: string }
  | { type: "h3"; id: string; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "callout"; text: string }
  | { type: "faq"; items: { q: string; a: string }[] };

/** Editorial publish state — usually derived from publishedAt vs now */
export type BlogPublishStatus = "draft" | "scheduled" | "published";

export type BlogPost = {
  slug: string;
  title: string;
  metaTitle: string;
  description: string;
  /** ISO calendar date (YYYY-MM-DD) or full ISO timestamp — live when <= now */
  publishedAt: string;
  updatedAt?: string;
  /** Optional explicit status; if omitted, derived from publishedAt */
  status?: BlogPublishStatus;
  category: BlogCategory;
  tags: string[];
  primaryKeyword: string;
  secondaryKeywords: string[];
  readingTime: string;
  author: string;
  relatedSlugs: string[];
  blocks: BlogBlock[];
};

export type BlogPostMeta = Omit<BlogPost, "blocks">;
