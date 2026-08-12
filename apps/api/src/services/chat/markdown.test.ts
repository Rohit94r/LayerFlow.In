import { describe, expect, it } from "vitest";
import { normalizeMarkdown } from "./markdown";

describe("normalizeMarkdown", () => {
  it("trims leading/trailing blank lines and normalizes CRLF", () => {
    const input = "\n\n**Answer**\r\nline two\r\n\r\n\n";
    expect(normalizeMarkdown(input)).toBe("**Answer**\nline two");
  });

  it("collapses 3+ blank lines to one blank line", () => {
    const input = "a\n\n\n\n\nb";
    expect(normalizeMarkdown(input)).toBe("a\n\nb");
  });

  it("leaves a single blank line intact", () => {
    const input = "a\n\nb";
    expect(normalizeMarkdown(input)).toBe("a\n\nb");
  });

  it("closes an unbalanced code fence", () => {
    const input = "Here:\n```js\nconst x = 1;\n";
    expect(normalizeMarkdown(input)).toBe("Here:\n```js\nconst x = 1;\n```");
  });

  it("leaves balanced fences untouched", () => {
    const input = "```js\nconst x = 1;\n```\nDone";
    expect(normalizeMarkdown(input)).toBe(input);
  });

  it("leaves code-block content and inline markers intact", () => {
    const input = "**bold** `inline`\n```js\nconst a = x ** 2;\n```";
    expect(normalizeMarkdown(input)).toBe(input);
  });

  it("returns an empty string unchanged", () => {
    expect(normalizeMarkdown("   \n\n  ")).toBe("");
  });
});
