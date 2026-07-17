"use client";

import { Cpu, DollarSign, Zap, Lightbulb, ArrowRight } from "lucide-react";
import type { PromptAnalysis } from "@/lib/types";

interface PromptAnalysisPanelProps {
  analysis: PromptAnalysis;
  onUseRecommended?: () => void;
}

export default function PromptAnalysisPanel({
  analysis,
  onUseRecommended,
}: PromptAnalysisPanelProps) {
  return (
    <div className="card overflow-hidden">
      <div className="border-b border-border px-4 py-3">
        <p className="text-sm text-brand">Prompt Analysis</p>
        <h3 className="text-sm font-semibold text-ink">Model intelligence</h3>
        <p className="mt-0.5 text-xs text-muted capitalize">
          Task type: {analysis.taskType.replace("-", " ")}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-px bg-border">
        <div className="bg-surface px-4 py-3">
          <p className="text-xs text-faint">Est. tokens</p>
          <p className="mt-0.5 text-sm font-medium text-ink">
            {analysis.estimatedTokensIn + analysis.estimatedTokensOut}
          </p>
          <p className="text-xs text-faint">
            {analysis.estimatedTokensIn} in · {analysis.estimatedTokensOut} out
          </p>
        </div>
        <div className="bg-surface px-4 py-3">
          <p className="text-xs text-faint">Est. cost</p>
          <p className="mt-0.5 text-sm font-medium text-ink">
            ${analysis.estimatedCost.toFixed(4)}
          </p>
        </div>
        <div className="bg-surface px-4 py-3">
          <p className="text-xs text-faint">Quality</p>
          <p className="mt-0.5 text-sm font-medium text-ink">
            {analysis.recommended.qualityPercent}%
          </p>
        </div>
      </div>

      <div className="space-y-3 p-4">
        <div className="rounded-lg border border-brand/30 bg-brand/5 p-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-medium text-brand">
                {analysis.recommended.label}
              </p>
              <p className="mt-0.5 text-sm font-semibold text-ink">
                {analysis.recommended.model}
              </p>
              <p className="text-xs text-faint">{analysis.recommended.provider}</p>
            </div>
            <div className="text-right text-xs">
              <p className="font-medium text-brand">
                {analysis.recommended.cheaperPercent}% cheaper
              </p>
              <p className="text-faint">{analysis.recommended.qualityPercent}% quality</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onUseRecommended}
            className="btn-primary mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium"
          >
            Use recommended
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        <div className="rounded-lg border border-border bg-surface-2 p-3">
          <p className="text-xs font-medium text-muted">{analysis.alternative.label}</p>
          <p className="mt-0.5 text-sm font-semibold text-ink">
            {analysis.alternative.model}
          </p>
          <p className="text-xs text-faint">{analysis.alternative.provider}</p>
        </div>

        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted">
            <Lightbulb className="h-3 w-3" />
            Why
          </p>
          <ul className="space-y-1.5">
            {analysis.why.map((reason) => (
              <li key={reason} className="flex items-start gap-2 text-xs text-muted">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand" />
                {reason}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex items-center gap-4 border-t border-border px-4 py-2.5 text-xs text-faint">
        <span className="flex items-center gap-1">
          <Cpu className="h-3 w-3" />
          {analysis.recommended.model}
        </span>
        <span className="flex items-center gap-1">
          <DollarSign className="h-3 w-3" />
          ~${analysis.estimatedCost.toFixed(4)}
        </span>
        <span className="flex items-center gap-1">
          <Zap className="h-3 w-3" />
          Fast
        </span>
      </div>
    </div>
  );
}
