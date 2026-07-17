"use client";

import { useState } from "react";
import { Save, Play, Copy, Check } from "lucide-react";
import type { Prompt } from "@/lib/types";

interface PromptEditorProps {
  prompt: Prompt;
}

export default function PromptEditor({ prompt }: PromptEditorProps) {
  const [content, setContent] = useState(prompt.content);
  const [title, setTitle] = useState(prompt.title);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="card flex flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1 bg-transparent text-base font-semibold text-[var(--color-ink)] outline-none placeholder:text-[var(--color-faint)]"
          placeholder="Prompt title"
        />
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-muted)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-ink)]"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-[var(--color-brand-2)]" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-muted)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-ink)]"
          >
            <Save className="h-3.5 w-3.5" />
            {saved ? "Saved!" : "Save"}
          </button>
          <button className="btn-primary flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium">
            <Play className="h-3.5 w-3.5" />
            Run
          </button>
        </div>
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="min-h-[280px] flex-1 resize-none bg-transparent px-4 py-4 font-mono text-sm leading-relaxed text-[var(--color-ink)] outline-none placeholder:text-[var(--color-faint)]"
        placeholder="Write your prompt here..."
      />

      <div className="flex items-center justify-between border-t border-[var(--color-border)] px-4 py-2.5">
        <div className="flex flex-wrap gap-1.5">
          {prompt.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-[var(--color-surface-2)] px-2 py-0.5 text-xs text-[var(--color-muted)]"
            >
              {tag}
            </span>
          ))}
        </div>
        <span className="text-xs text-[var(--color-faint)]">
          {content.length} chars
        </span>
      </div>
    </div>
  );
}
