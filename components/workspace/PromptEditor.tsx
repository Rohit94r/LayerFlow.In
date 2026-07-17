"use client";

import { useMemo, useState } from "react";
import { Save, Play, Copy, Check } from "lucide-react";
import type { Prompt, PromptVersion } from "@/lib/types";
import { analyzePrompt } from "@/lib/prompt-analysis";
import PromptAnalysisPanel from "./PromptAnalysis";

interface PromptEditorProps {
  prompt: Prompt;
  onVersionCreated?: (version: PromptVersion) => void;
}

export default function PromptEditor({ prompt, onVersionCreated }: PromptEditorProps) {
  const [content, setContent] = useState(prompt.content);
  const [title, setTitle] = useState(prompt.title);
  const [model, setModel] = useState(prompt.model);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [versionCount, setVersionCount] = useState(prompt.versions.length);
  const [showAnalysis, setShowAnalysis] = useState(true);

  const analysis = useMemo(() => analyzePrompt(content, model), [content, model]);
  const hasChanges = content !== prompt.content || title !== prompt.title;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    if (!hasChanges && content === prompt.content) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      return;
    }

    const newVersion: PromptVersion = {
      id: `v${versionCount + 1}`,
      version: versionCount + 1,
      content,
      model,
      provider: analysis.recommended.provider,
      cost: analysis.estimatedCost,
      tokensIn: analysis.estimatedTokensIn,
      tokensOut: analysis.estimatedTokensOut,
      output: `[Mock output for v${versionCount + 1}] ${content.slice(0, 80)}...`,
      createdAt: new Date().toISOString(),
      note: hasChanges ? "Auto-saved version" : undefined,
    };

    setVersionCount((c) => c + 1);
    onVersionCreated?.(newVersion);
    setSaved(true);
    setShowAnalysis(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="card flex flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1 bg-transparent text-base font-semibold text-ink outline-none placeholder:text-faint"
            placeholder="Prompt title"
          />
          <div className="flex items-center gap-2">
            <button type="button" onClick={handleCopy} className="btn-secondary px-3 py-1.5 text-xs">
              {copied ? <Check className="h-3.5 w-3.5 text-brand" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
            <button type="button" onClick={handleSave} className="btn-secondary px-3 py-1.5 text-xs">
              <Save className="h-3.5 w-3.5" />
              {saved ? "Saved · v" + versionCount : hasChanges ? "Save new version" : "Save"}
            </button>
            <button type="button" className="btn-primary flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium">
              <Play className="h-3.5 w-3.5" />
              Run
            </button>
          </div>
        </div>

        {prompt.description && (
          <p className="border-b border-border px-4 py-2 text-sm text-muted">{prompt.description}</p>
        )}

        <textarea
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            setShowAnalysis(true);
          }}
          className="min-h-[240px] flex-1 resize-none bg-transparent px-4 py-4 font-mono text-sm leading-relaxed text-ink outline-none placeholder:text-faint"
          placeholder="Write your prompt here..."
        />

        {prompt.variables.length > 0 && (
          <div className="border-t border-border px-4 py-3">
            <p className="mb-2 text-xs font-medium text-muted">Variables</p>
            <div className="flex flex-wrap gap-2">
              {prompt.variables.map((v) => (
                <span
                  key={v.name}
                  className="rounded-md border border-border bg-surface-2 px-2 py-1 font-mono text-xs text-brand"
                >
                  {`{{${v.name}}}`}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-border px-4 py-2.5">
          <div className="flex flex-wrap items-center gap-2">
            {prompt.tags.map((tag) => (
              <span key={tag} className="rounded-md border border-border bg-surface-2 px-2 py-0.5 text-xs text-muted">
                {tag}
              </span>
            ))}
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="rounded-md border border-border bg-surface-2 px-2 py-0.5 text-xs text-muted outline-none"
            >
              <option value="gpt-4o">gpt-4o</option>
              <option value="claude-sonnet-4">claude-sonnet-4</option>
              <option value="gemini-2.5-flash">gemini-2.5-flash</option>
              <option value="deepseek-v3">deepseek-v3</option>
            </select>
          </div>
          <span className="text-xs text-faint">{content.length} chars · v{versionCount}</span>
        </div>
      </div>

      {showAnalysis && (
        <PromptAnalysisPanel
          analysis={analysis}
          onUseRecommended={() => setModel(analysis.recommended.model)}
        />
      )}

      {prompt.notes && (
        <div className="card p-4">
          <p className="text-xs font-medium text-muted">Notes</p>
          <p className="mt-1 text-sm text-ink">{prompt.notes}</p>
        </div>
      )}
    </div>
  );
}
