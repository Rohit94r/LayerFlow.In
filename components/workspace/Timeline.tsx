"use client";

import { useEffect, useState } from "react";
import {
  GitCommit,
  DollarSign,
  Cpu,
  RotateCcw,
  Play,
  GitCompare,
  Download,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import type { PromptVersion } from "@/lib/types";
import { restorePromptVersion, createRun } from "@/lib/api";
import { mapPromptVersion } from "@/lib/api/mappers";
import { errorMessage } from "@/lib/hooks/use-async-data";

interface TimelineProps {
  promptId: string;
  versions: PromptVersion[];
  activeVersion?: number;
  onVersionsChange?: (versions: PromptVersion[]) => void;
  onRestored?: (version: PromptVersion) => void;
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
  promptId,
  versions: initialVersions,
  activeVersion,
  onVersionsChange,
  onRestored,
}: TimelineProps) {
  const [versions, setVersions] = useState(initialVersions);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sorted = [...versions].sort((a, b) => b.version - a.version);

  useEffect(() => {
    setVersions(initialVersions);
  }, [initialVersions]);

  const showAction = (msg: string) => {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(null), 2500);
  };

  const handleRollback = async (version: PromptVersion) => {
    setBusyId(version.id);
    setError(null);
    try {
      const res = await restorePromptVersion(promptId, version.id);
      const mapped = mapPromptVersion(res.version);
      const next = [...versions, mapped];
      setVersions(next);
      onVersionsChange?.(next);
      onRestored?.(mapped);
      showAction(`Restored v${version.version} as v${mapped.version}`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const handleReplay = async (version: PromptVersion) => {
    setBusyId(version.id);
    setError(null);
    try {
      await createRun({
        promptVersionId: version.id,
        model: version.model !== "unknown" ? version.model : "gpt-4o",
        source: "playground",
      });
      showAction(`Replayed v${version.version}`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const handleExport = (version: PromptVersion) => {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            version: version.version,
            content: version.content,
            model: version.model,
            output: version.output,
            createdAt: version.createdAt,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `prompt-v${version.version}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showAction(`Exported v${version.version}`);
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
      {error && (
        <p className="mt-2 rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs text-red-500">
          {error}
        </p>
      )}

      {sorted.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No versions yet — save to create v1.</p>
      ) : (
        <div className="relative mt-4 space-y-0">
          {sorted.map((version, i) => {
            const isActive = activeVersion
              ? version.version === activeVersion
              : i === 0;
            const isLast = i === sorted.length - 1;
            const busy = busyId === version.id;

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
                  <GitCommit
                    className={`h-3 w-3 ${isActive ? "text-brand" : "text-faint"}`}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-medium ${isActive ? "text-ink" : "text-muted"}`}
                    >
                      v{version.version}
                    </span>
                    <span className="timeline-commit text-faint">
                      {shortHash(version.id)}
                    </span>
                    {version.note && (
                      <span className="text-xs text-faint">— {version.note}</span>
                    )}
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted">
                    {version.content}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-faint">
                    <span className="flex items-center gap-1">
                      <Cpu className="h-3 w-3" />
                      {version.model}
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />${version.cost.toFixed(3)}
                    </span>
                    <span>{version.tokensIn + version.tokensOut} tok</span>
                    <span>{formatDate(version.createdAt)}</span>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={() => handleRollback(version)}
                      disabled={busy}
                      className="btn-secondary flex items-center gap-1 px-2 py-0.5 text-xs disabled:opacity-60"
                    >
                      {busy ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <RotateCcw className="h-3 w-3" />
                      )}
                      Restore
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReplay(version)}
                      disabled={busy}
                      className="btn-secondary flex items-center gap-1 px-2 py-0.5 text-xs disabled:opacity-60"
                    >
                      <Play className="h-3 w-3" />
                      Replay
                    </button>
                    <Link
                      href={`/compare?promptId=${promptId}&versionId=${version.id}`}
                      className="btn-secondary flex items-center gap-1 px-2 py-0.5 text-xs"
                    >
                      <GitCompare className="h-3 w-3" />
                      Compare
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleExport(version)}
                      className="btn-secondary flex items-center gap-1 px-2 py-0.5 text-xs"
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
      )}
    </div>
  );
}
