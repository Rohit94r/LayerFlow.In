import Link from "next/link";
import type { ReactNode } from "react";
import type { BlogBlock } from "@/lib/blog/types";

/** Render markdown-lite links: [label](/path) */
function richText(text: string) {
  const parts: ReactNode[] = [];
  const re = /\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    const href = match[2];
    const label = match[1];
    parts.push(
      <Link
        key={key++}
        href={href}
        className="font-medium text-brand underline-offset-2 hover:underline"
      >
        {label}
      </Link>,
    );
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export default function BlogContent({ blocks }: { blocks: BlogBlock[] }) {
  return (
    <div className="blog-prose space-y-6">
      {blocks.map((block, i) => {
        switch (block.type) {
          case "p":
            return (
              <p
                key={i}
                className="text-base leading-relaxed text-muted sm:text-lg sm:leading-8"
              >
                {richText(block.text)}
              </p>
            );
          case "h2":
            return (
              <h2
                key={block.id}
                id={block.id}
                className="scroll-mt-28 pt-4 font-sans text-2xl font-semibold tracking-tight text-ink sm:text-3xl"
              >
                {block.text}
              </h2>
            );
          case "h3":
            return (
              <h3
                key={block.id}
                id={block.id}
                className="scroll-mt-28 pt-2 font-sans text-xl font-semibold text-ink"
              >
                {block.text}
              </h3>
            );
          case "ul":
            return (
              <ul key={i} className="list-disc space-y-2 pl-6 text-muted">
                {block.items.map((item) => (
                  <li key={item} className="leading-relaxed">
                    {richText(item)}
                  </li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={i} className="list-decimal space-y-2 pl-6 text-muted">
                {block.items.map((item) => (
                  <li key={item} className="leading-relaxed">
                    {richText(item)}
                  </li>
                ))}
              </ol>
            );
          case "callout":
            return (
              <aside
                key={i}
                className="rounded-xl border border-brand/25 bg-brand/5 px-5 py-4 text-sm leading-relaxed text-ink sm:text-base"
              >
                {richText(block.text)}
              </aside>
            );
          case "faq":
            return (
              <div key={i} className="space-y-4">
                {block.items.map((item) => (
                  <details
                    key={item.q}
                    className="group rounded-xl border border-border bg-surface/40 px-5 py-4"
                  >
                    <summary className="cursor-pointer list-none font-semibold text-ink marker:content-none [&::-webkit-details-marker]:hidden">
                      <span className="flex items-start justify-between gap-3">
                        {item.q}
                        <span className="font-mono text-faint transition group-open:rotate-45">
                          +
                        </span>
                      </span>
                    </summary>
                    <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
                      {richText(item.a)}
                    </p>
                  </details>
                ))}
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
