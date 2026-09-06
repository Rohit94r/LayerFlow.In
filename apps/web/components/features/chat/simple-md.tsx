import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Minimal markdown for chat messages: fenced code blocks, inline code and
 * bold. Everything else renders as-is with preserved whitespace — the chat
 * must never drop or garble a user's text while streaming.
 */
export function renderMessage(text: string, className?: string): ReactNode {
  const parts = text.split(/(```[\s\S]*?```)/g);
  return (
    <div className={cn("whitespace-pre-wrap break-words leading-relaxed", className)}>
      {parts.map((part, i) => {
        if (part.startsWith("```")) {
          const body = part.slice(3, -3).replace(/^\n/, "");
          const lang = body.match(/^[a-zA-Z0-9_-]+\n/)?.[0]?.trim() ?? "";
          const code = lang ? body.slice(lang.length + 1) : body;
          return (
            <pre
              key={i}
              className="my-2 overflow-x-auto rounded-lg border border-border bg-[#0d1117] p-3 text-[12.5px] leading-relaxed text-emerald-100/90"
            >
              <code>{code}</code>
            </pre>
          );
        }
        return <InlineMarkdown key={i} text={part} />;
      })}
    </div>
  );
}

function InlineMarkdown({ text }: { text: string }) {
  const nodes: ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const token = match[0];
    if (token.startsWith("**")) {
      nodes.push(
        <strong key={key++} className="font-semibold text-ink">
          {token.slice(2, -2)}
        </strong>,
      );
    } else {
      nodes.push(
        <code key={key++} className="rounded bg-surface-2 px-1 py-0.5 font-mono text-[0.9em] text-brand-2">
          {token.slice(1, -1)}
        </code>,
      );
    }
    last = match.index + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return <>{nodes}</>;
}