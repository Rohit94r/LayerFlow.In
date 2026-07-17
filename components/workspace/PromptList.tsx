import Link from "next/link";
import { Star, Clock, Tag } from "lucide-react";
import type { Prompt } from "@/lib/types";

interface PromptListProps {
  prompts: Prompt[];
  showProject?: boolean;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default function PromptList({ prompts, showProject = false }: PromptListProps) {
  if (prompts.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center px-6 py-16 text-center">
        <p className="text-sm text-[var(--color-muted)]">No prompts yet</p>
        <button className="btn-primary mt-4 rounded-lg px-4 py-2 text-sm font-medium">
          Create prompt
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {prompts.map((prompt) => (
        <Link
          key={prompt.id}
          href={`/prompts/${prompt.id}`}
          className="card card-hover flex items-start gap-4 p-4"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm font-semibold text-[var(--color-ink)]">
                {prompt.title}
              </h3>
              {prompt.favorite && (
                <Star className="h-3.5 w-3.5 shrink-0 fill-[var(--color-brand)] text-[var(--color-brand)]" />
              )}
            </div>
            <p className="mt-1 line-clamp-2 text-sm text-[var(--color-muted)]">
              {prompt.content}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[var(--color-faint)]">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDate(prompt.updatedAt)}
              </span>
              <span>{prompt.versions.length} version{prompt.versions.length !== 1 ? "s" : ""}</span>
              {prompt.tags.slice(0, 2).map((tag) => (
                <span key={tag} className="flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  {tag}
                </span>
              ))}
            </div>
          </div>
          {showProject && (
            <span className="shrink-0 rounded-md bg-[var(--color-surface-2)] px-2 py-1 text-xs text-[var(--color-muted)]">
              {prompt.projectId.replace("proj_", "")}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}
