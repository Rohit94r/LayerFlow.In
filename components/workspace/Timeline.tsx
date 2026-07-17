"use client";

import { useState } from "react";
import {
  GitCommit,
  DollarSign,
  Cpu,
  RotateCcw,
  Copy,
  Play,
  GitCompare,
  Download,
} from "lucide-react";
import type { PromptVersion } from "@/lib/types";

interface TimelineProps {
  versions: PromptVersion[];
  activeVersion?: number;
  onVersionsChange?: (versions: PromptVersion[]) => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function shortHash(id: string): string {
  return id.replace(/^v/, "").slice(0, 7);
}

export default function Timeline({
  versions: initialVersions,
  activeVersion,
  onVersionsChange,
}: TimelineProps) {
  const [versions, setVersions] = useState(initialVersions);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const sorted = [...versions].sort((a, b) => b.version - a.version);

  const showAction = (msg: string) => {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(null), 2000);
  };

  const handleRollback = (version: PromptVersion) => {
    showAction(`Rolled back to v${version.version}`);
  };

  const handleDuplicate = (version: PromptVersion) => {
    const newVersion: PromptVersion = {
      ...version,
      id: `v${versions.length + 1}`,
      version: versions.length + 1,
      createdAt: new Date().toISOString(),
      note: `Duplicated from v${version.version}`,
    };
    const next = [...versions, newVersion];
    setVersions(next);
    onVersionsChange?.(next);
    showAction(`Duplicated v${version.version} → v${newVersion.version}`);
  };

  return (
    <div className="card p-4">
      <p className="text-sm text-brand">Prompt Timeline</p>
      <h3 className="mt-1 text-sm font-semibold text-ink">Version history</h3>
      <p className="mt-0.5 text-xs text-muted">
        Git for prompts — model, cost, and output per version.
      </p>

      {actionMsg && (
        <p className="mt-2 rounded-md border border-brand/30 bg-brand/10 px-2 py-1 text-xs text-brand">
          {actionMsg}
        </p>
      )}

      <div className="relative mt-4 space-y-0">
        {sorted.map((version, i) => {
          const isActive = activeVersion
            ? version.version === activeVersion
            : i === 0;
          const isLast = i === sorted.length - 1;

          return (
            <div key={version.id} className="relative flex gap-3 pb-4">
              {!isLast && (
                <div className="absolute left-[11px] top-6 h-[calc(100%-12px)] w-px bg-border" />
              )}
              <div
                className={`relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                  isActive ? "border-brand bg-brand/10" : "border-border bg-surface-2"
                }`}
              >
                <GitCommit className={`h-3 w-3 ${isActive ? "text-brand" : "text-faint"}`} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${isActive ? "text-ink" : "text-muted"}`}>
                    v{version.version}
                  </span>
                  <span className="timeline-commit text-faint">{shortHash(version.id)}</span>
                  {version.note && (
                    <span className="text-xs text-faint">— {version.note}</span>
                  )}
                </div>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted">{version.content}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-faint">
                  <span className="flex items-center gap-1">
                    <Cpu className="h-3 w-3" />
                    {version.model}
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    ${version.cost.toFixed(3)}
                  </span>
                  <span>
                    {version.tokensIn + version.tokensOut} tok
                  </span>
                  <span>{formatDate(version.createdAt)}</span>
                </div>

                <div className="mt-2 flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() => handleRollback(version)}
                    className="btn-secondary flex items-center gap-1 px-2 py-0.5 text-xs"
                    title="Rollback"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Rollback
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDuplicate(version)}
                    className="btn-secondary flex items-center gap-1 px-2 py-0.5 text-xs"
                    title="Duplicate"
                  >
                    <Copy className="h-3 w-3" />
                    Duplicate
                  </button>
                  <button
                    type="button"
                    onClick={() => showAction(`Replaying v${version.version}…`)}
                    className="btn-secondary flex items-center gap-1 px-2 py-0.5 text-xs"
                    title="Replay"
                  >
                    <Play className="h-3 w-3" />
                    Replay
                  </button>
                  <a
                    href="/compare"
                    className="btn-secondary flex items-center gap-1 px-2 py-0.5 text-xs"
                    title="Compare"
                  >
                    <GitCompare className="h-3 w-3" />
                    Compare
                  </a>
                  <button
                    type="button"
                    onClick={() => showAction(`Exported v${version.version}`)}
                    className="btn-secondary flex items-center gap-1 px-2 py-0.5 text-xs"
                    title="Export"
                  >
                    <Download className="h-3 w-3" />
                    Export
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
