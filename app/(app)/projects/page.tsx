import Link from "next/link";
import { Plus, FolderKanban, Folder, ChevronRight } from "lucide-react";
import {
  domains,
  projects,
  getProjectsForDomain,
  getDomain,
} from "@/lib/mock-data";

export const metadata = {
  title: "Projects",
};

interface ProjectsPageProps {
  searchParams: Promise<{ domain?: string }>;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const { domain: domainFilter } = await searchParams;
  const filteredProjects = domainFilter
    ? getProjectsForDomain(domainFilter)
    : projects;
  const activeDomain = domainFilter ? getDomain(domainFilter) : undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-ink)]">
            {activeDomain ? `${activeDomain.name} Projects` : "Projects"}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            {activeDomain
              ? activeDomain.description
              : "All projects across your workspace domains."}
          </p>
        </div>
        <button className="btn-primary flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium">
          <Plus className="h-4 w-4" />
          New project
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/projects"
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            !domainFilter
              ? "bg-[var(--color-surface-2)] text-[var(--color-ink)]"
              : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
          }`}
        >
          All
        </Link>
        {domains.map((d) => (
          <Link
            key={d.id}
            href={`/projects?domain=${d.id}`}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              domainFilter === d.id
                ? "bg-[var(--color-surface-2)] text-[var(--color-ink)]"
                : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
            }`}
          >
            {d.name}
          </Link>
        ))}
      </div>

      <div className="space-y-3">
        {filteredProjects.map((project) => {
          const domain = getDomain(project.domainId);
          return (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="card card-hover flex items-center gap-4 p-5"
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                style={{
                  backgroundColor: domain ? `${domain.color}18` : undefined,
                }}
              >
                <FolderKanban
                  className="h-5 w-5"
                  style={{ color: domain?.color }}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-[var(--color-ink)]">
                    {project.name}
                  </h3>
                  {domain && (
                    <span className="rounded-md bg-[var(--color-surface-2)] px-2 py-0.5 text-xs text-[var(--color-faint)]">
                      {domain.name}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-[var(--color-muted)]">
                  {project.description}
                </p>
                <div className="mt-2 flex items-center gap-4 text-xs text-[var(--color-faint)]">
                  <span className="flex items-center gap-1">
                    <Folder className="h-3 w-3" />
                    {project.folderCount} folders
                  </span>
                  <span>{project.promptCount} prompts</span>
                  <span>Updated {formatDate(project.updatedAt)}</span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-[var(--color-faint)]" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
