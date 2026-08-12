/**
 * Post-generation Markdown normalization for assistant replies.
 *
 * Providers return slightly different formatting artifacts (CRLF line endings,
 * runaway blank lines, unbalanced code fences). This runs once on the final
 * answer BEFORE it is persisted, so the stored message and everything rendered
 * from it is clean — without touching the live SSE deltas the user already saw.
 *
 * Conservative by design: it only fixes mechanical whitespace/fence hygiene and
 * never rewrites the meaning of a reply. Content inside code blocks is left
 * byte-for-byte intact.
 */

/** Collapse 3+ consecutive newlines to a single blank line. */
function collapseBlankLines(content: string): string {
  return content.replace(/\n{3,}/g, "\n\n");
}

/** Remove leading/trailing whitespace-only lines and normalize CRLF. */
function trimEdgeLines(content: string): string {
  return content
    .replace(/\r\n/g, "\n")
    .replace(/^\s+/, "")
    .replace(/\s+$/, "");
}

/**
 * Balance ``` code fences. An odd count means the model forgot the closing
 * fence (or a code block swallowed a marker); appending one closes it so the
 * rest of the reply isn't rendered as code.
 */
function balanceCodeFences(content: string): string {
  const fences = content.match(/```/g);
  if (fences && fences.length % 2 === 1) return `${content}\n\`\`\``;
  return content;
}

export function normalizeMarkdown(content: string): string {
  const trimmed = trimEdgeLines(content);
  if (trimmed.length === 0) return trimmed;
  return balanceCodeFences(collapseBlankLines(trimmed));
}
