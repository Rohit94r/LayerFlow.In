import Link from "next/link";
import { Plus, Search } from "lucide-react";
import PromptList from "@/components/workspace/PromptList";
import { prompts } from "@/lib/mock-data";

export const metadata = {
  title: "Prompts",
};

export default function PromptsPage() {
  const sorted = [...prompts].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-ink)]">
            Prompts
          </h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            All prompts across your workspace — versioned, searchable, reusable.
          </p>
        </div>
        <button className="btn-primary flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium">
          <Plus className="h-4 w-4" />
          New prompt
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-faint)]" />
        <input
          type="search"
          placeholder="Search prompts..."
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] py-2.5 pl-10 pr-4 text-sm text-[var(--color-ink)] outline-none placeholder:text-[var(--color-faint)] focus:border-[var(--color-border-strong)]"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {["All", "Favorites", "ui", "api", "compare", "copy"].map((filter, i) => (
          <button
            key={filter}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              i === 0
                ? "bg-[var(--color-surface-2)] text-[var(--color-ink)]"
                : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      <PromptList prompts={sorted} showProject />
    </div>
  );
}
