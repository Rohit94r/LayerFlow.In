import { GitCommit, DollarSign, Cpu } from "lucide-react";
import type { PromptVersion } from "@/lib/types";

interface TimelineProps {
  versions: PromptVersion[];
  activeVersion?: number;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Timeline({ versions, activeVersion }: TimelineProps) {
  const sorted = [...versions].sort((a, b) => b.version - a.version);

  return (
    <div className="card p-4">
      <h3 className="mb-4 text-sm font-semibold text-[var(--color-ink)]">
        Version Timeline
      </h3>
      <div className="relative space-y-0">
        {sorted.map((version, i) => {
          const isActive = activeVersion
            ? version.version === activeVersion
            : i === 0;
          const isLast = i === sorted.length - 1;

          return (
            <div key={version.id} className="relative flex gap-3 pb-4">
              {!isLast && (
                <div className="absolute left-[11px] top-6 h-[calc(100%-12px)] w-px bg-[var(--color-border)]" />
              )}
              <div
                className={`relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                  isActive
                    ? "border-[var(--color-brand)] bg-[var(--color-brand)]/15"
                    : "border-[var(--color-border)] bg-[var(--color-surface-2)]"
                }`}
              >
                <GitCommit
                  className={`h-3 w-3 ${
                    isActive
                      ? "text-[var(--color-brand)]"
                      : "text-[var(--color-faint)]"
                  }`}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-medium ${
                      isActive
                        ? "text-[var(--color-ink)]"
                        : "text-[var(--color-muted)]"
                    }`}
                  >
                    v{version.version}
                  </span>
                  {version.note && (
                    <span className="text-xs text-[var(--color-faint)]">
                      — {version.note}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 line-clamp-2 text-xs text-[var(--color-muted)]">
                  {version.content}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-[var(--color-faint)]">
                  <span className="flex items-center gap-1">
                    <Cpu className="h-3 w-3" />
                    {version.model}
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    ${version.cost.toFixed(3)}
                  </span>
                  <span>{formatDate(version.createdAt)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
