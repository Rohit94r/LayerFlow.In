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

export type BlogPost = {
  slug: string;
  title: string;
  metaTitle: string;
  description: string;
  publishedAt: string; // ISO date
  updatedAt?: string;
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
