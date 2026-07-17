import Link from "next/link";
import { Plus, ArrowRight } from "lucide-react";
import DomainCard from "@/components/workspace/DomainCard";
import PromptList from "@/components/workspace/PromptList";
import BudgetMeter from "@/components/workspace/BudgetMeter";
import { domains, prompts, budget } from "@/lib/mock-data";

export const metadata = {
  title: "Workspace",
};

export default function WorkspacePage() {
  const recentPrompts = [...prompts]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 4);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-ink)]">
            Workspace
          </h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Organize your AI work by domain — coding, marketing, study, and more.
          </p>
        </div>
        <button className="btn-primary flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium">
          <Plus className="h-4 w-4" />
          New project
        </button>
      </div>

      <BudgetMeter budget={budget} />

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--color-ink)]">
            Domains
          </h2>
          <Link
            href="/projects"
            className="flex items-center gap-1 text-sm text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)]"
          >
            All projects
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {domains.map((domain) => (
            <DomainCard key={domain.id} domain={domain} />
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--color-ink)]">
            Recent prompts
          </h2>
          <Link
            href="/prompts"
            className="flex items-center gap-1 text-sm text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)]"
          >
            View all
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <PromptList prompts={recentPrompts} />
      </section>
    </div>
  );
}
