"use client";

import { useEffect, useMemo, useState } from "react";
import { Save, Play, Copy, Check, Loader2 } from "lucide-react";
import type { Prompt, PromptVersion, PromptAnalysis } from "@/lib/types";
import PromptAnalysisPanel from "./PromptAnalysis";
import {
  createPromptVersion,
  updatePrompt,
  createRun,
  analyzePrompt,
} from "@/lib/api";
import { mapPromptVersion } from "@/lib/api/mappers";
import { microToUsd } from "@/lib/api/money";
import { ApiClientError } from "@/lib/api/client";
import { errorMessage } from "@/lib/hooks/use-async-data";

interface PromptEditorProps {
  prompt: Prompt;
  onVersionCreated?: (version: PromptVersion) => void;
  onPromptUpdated?: (title: string) => void;
  onRunComplete?: (output: string, version?: PromptVersion) => void;
}

function toUiAnalysis(
  analysis: Awaited<ReturnType<typeof analyzePrompt>>["analysis"],
): PromptAnalysis {
  return {
    estimatedTokensIn: analysis.estimatedTokensIn,
    estimatedTokensOut: analysis.estimatedTokensOut,
    estimatedCost: microToUsd(analysis.estimatedCostMicro),
    recommended: {
      model: analysis.recommended.model,
      provider: analysis.recommended.provider,
      qualityPercent: analysis.recommended.qualityPercent ?? 90,
      cheaperPercent: analysis.recommended.cheaperPercent ?? 0,
      label: analysis.recommended.label,
    },
    alternative: {
      model: analysis.alternative.model,
      provider: analysis.alternative.provider,
      label: analysis.alternative.label,
    },
    why: analysis.why,
    taskType: analysis.taskType,
  };
}

export default function PromptEditor({
  prompt,
  onVersionCreated,
  onPromptUpdated,
  onRunComplete,
}: PromptEditorProps) {
  const [content, setContent] = useState(prompt.content);
  const [title, setTitle] = useState(prompt.title);
  const [model, setModel] = useState(prompt.model || "gpt-4o");
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [versionCount, setVersionCount] = useState(prompt.versions.length);
  const [showAnalysis, setShowAnalysis] = useState(true);
  const [analysis, setAnalysis] = useState<PromptAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runOutput, setRunOutput] = useState<string | null>(null);

  const hasChanges = content !== prompt.content || title !== prompt.title;

  useEffect(() => {
    setContent(prompt.content);
    setTitle(prompt.title);
    setModel(prompt.model || "gpt-4o");
    setVersionCount(prompt.versions.length);
  }, [prompt]);

  useEffect(() => {
    if (!content.trim()) {
      setAnalysis(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setAnalyzing(true);
      try {
        const res = await analyzePrompt({ content, currentModel: model });
        if (!cancelled) setAnalysis(toUiAnalysis(res.analysis));
      } catch {
        if (!cancelled) setAnalysis(null);
      } finally {
        if (!cancelled) setAnalyzing(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [content, model]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      if (title !== prompt.title) {
        await updatePrompt(prompt.id, { title });
        onPromptUpdated?.(title);
      }
      if (content !== prompt.content || prompt.versions.length === 0) {
        const res = await createPromptVersion(prompt.id, {
          body: content,
          note: hasChanges ? "Auto-saved version" : undefined,
          modelHint: model,
        });
        const mapped = mapPromptVersion(res.version);
        setVersionCount(res.version.version);
        onVersionCreated?.(mapped);
      }
      setSaved(true);
      setShowAnalysis(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleRun = async () => {
    setRunning(true);
    setError(null);
    setRunOutput(null);
    try {
      let versionId = prompt.versions[prompt.versions.length - 1]?.id;
      if (content !== prompt.content || !versionId) {
        const res = await createPromptVersion(prompt.id, {
          body: content,
          note: "Saved before run",
          modelHint: model,
        });
        const mapped = mapPromptVersion(res.version);
        versionId = res.version.id;
        setVersionCount(res.version.version);
        onVersionCreated?.(mapped);
      }
      if (title !== prompt.title) {
        await updatePrompt(prompt.id, { title });
        onPromptUpdated?.(title);
      }
      const runRes = await createRun({
        promptVersionId: versionId,
        model,
        source: "playground",
      });
      const output = runRes.run.output ?? "";
      setRunOutput(output);
      onRunComplete?.(output);
    } catch (err) {
      if (err instanceof ApiClientError && err.isBudgetExceeded) {
        setError(
          "Budget exceeded — this run was blocked. Raise your limit in Cost / Budget.",
        );
      } else {
        setError(errorMessage(err));
      }
    } finally {
      setRunning(false);
    }
  };

  const analysisPanel = useMemo(() => analysis, [analysis]);

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
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {saved ? `Saved · v${versionCount}` : hasChanges ? "Save new version" : "Save"}
            </button>
            <button
              type="button"
              onClick={handleRun}
              disabled={running}
              className="btn-primary flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-60"
            >
              {running ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
              {running ? "Running…" : "Run"}
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
              <span
                key={tag}
                className="rounded-md border border-border bg-surface-2 px-2 py-0.5 text-xs text-muted"
              >
                {tag}
              </span>
            ))}
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="rounded-md border border-border bg-surface-2 px-2 py-0.5 text-xs text-muted outline-none"
            >
              <option value="gpt-4o">gpt-4o</option>
              <option value="gpt-4o-mini">gpt-4o-mini</option>
              <option value="claude-sonnet-4">claude-sonnet-4</option>
              <option value="gemini-2.5-flash">gemini-2.5-flash</option>
              <option value="deepseek-v3">deepseek-v3</option>
            </select>
          </div>
          <span className="text-xs text-faint">
            {content.length} chars · v{versionCount}
            {analyzing ? " · analyzing…" : ""}
          </span>
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">
          {error}
        </p>
      )}

      {runOutput && (
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-ink">Run output</h3>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted">
            {runOutput}
          </p>
        </div>
      )}

      {showAnalysis && analysisPanel && (
        <PromptAnalysisPanel
          analysis={analysisPanel}
          onUseRecommended={() => setModel(analysisPanel.recommended.model)}
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
