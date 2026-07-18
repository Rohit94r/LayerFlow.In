"use client";

import Link from "next/link";
import { Star, Clock, DollarSign, Cpu } from "lucide-react";
import type { Domain, Project, Prompt } from "@/lib/types";

interface PromptListProps {
  prompts: Prompt[];
  showProject?: boolean;
  domains?: Domain[];
  projects?: Project[];
  emptyAction?: React.ReactNode;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default function PromptList({
  prompts,
  showProject = false,
  domains = [],
  projects = [],
  emptyAction,
}: PromptListProps) {
  if (prompts.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center px-6 py-16 text-center">
        <p className="text-sm text-muted">No prompts yet</p>
        {emptyAction ?? (
          <Link
            href="/prompts"
            className="btn-primary mt-4 rounded-lg px-4 py-2 text-sm font-medium"
          >
            Create prompt
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
      {prompts.map((prompt) => {
        const project = showProject
          ? projects.find((p) => p.id === prompt.projectId)
          : null;
        const domain = domains.find((d) => d.id === prompt.domainId);
        const totalCost =
          prompt.versions.length > 0
            ? prompt.versions.reduce((sum, v) => sum + v.cost, 0)
            : prompt.cost;

        return (
          <Link
            key={prompt.id}
            href={`/prompts/${prompt.id}`}
            className="card-hover flex items-start gap-4 px-4 py-3.5 transition-colors"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-sm font-semibold text-ink">{prompt.title}</h3>
                {prompt.favorite && (
                  <Star className="h-3.5 w-3.5 shrink-0 fill-brand text-brand" />
                )}
              </div>
              {prompt.description && (
                <p className="mt-0.5 line-clamp-1 text-xs text-faint">{prompt.description}</p>
              )}
              <p className="mt-0.5 line-clamp-1 text-sm text-muted">{prompt.content || "No body yet"}</p>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-faint">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDate(prompt.updatedAt)}
                </span>
                <span>
                  {prompt.versions.length} version
                  {prompt.versions.length !== 1 ? "s" : ""}
                </span>
                <span className="flex items-center gap-1">
                  <Cpu className="h-3 w-3" />
                  {prompt.model}
                </span>
                <span className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  ${totalCost.toFixed(3)}
                </span>
                {domain && (
                  <span className="rounded border border-border px-1.5 py-0.5">{domain.name}</span>
                )}
                {prompt.tags.slice(0, 2).map((tag) => (
                  <span key={tag} className="rounded border border-border px-1.5 py-0.5">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            {showProject && project && (
              <span className="shrink-0 rounded-md border border-border bg-surface-2 px-2 py-1 text-xs text-muted">
                {project.name}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
