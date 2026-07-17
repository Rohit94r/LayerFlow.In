import { Plus, Search } from "lucide-react";
import PromptList from "@/components/workspace/PromptList";
import PageHeader from "@/components/workspace/PageHeader";
import FilterPills from "@/components/workspace/FilterPills";
import { prompts } from "@/lib/mock-data";

export const metadata = {
  title: "Prompts",
};

export default function PromptsPage() {
  const sorted = [...prompts].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  const filterItems = ["All", "Favorites", "ui", "api", "compare", "copy"].map(
    (filter, i) => ({
      label: filter,
      active: i === 0,
    })
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Prompt Workspace"
        title="Prompts"
        description="All prompts across your workspace — versioned, searchable, reusable."
        actions={
          <button
            type="button"
            className="btn-primary flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            New prompt
          </button>
        }
      />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
        <input
          type="search"
          placeholder="Search prompts..."
          className="workspace-input py-2.5 pl-10"
        />
      </div>

      <FilterPills items={filterItems} />

      <PromptList prompts={sorted} showProject />
    </div>
  );
}
