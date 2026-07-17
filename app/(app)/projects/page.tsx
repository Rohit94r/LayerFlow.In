import Link from "next/link";
import { Plus, FolderKanban, Folder, ChevronRight } from "lucide-react";
import PageHeader from "@/components/workspace/PageHeader";
import FilterPills from "@/components/workspace/FilterPills";
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

  const filterItems = [
    { label: "All", href: "/projects", active: !domainFilter },
    ...domains.map((d) => ({
      label: d.name,
      href: `/projects?domain=${d.id}`,
      active: domainFilter === d.id,
    })),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace"
        title={activeDomain ? `${activeDomain.name} projects` : "Projects"}
        description={
          activeDomain
            ? activeDomain.description
            : "Structure your AI work across domains — marketing, coding, study, and more."
        }
        actions={
          <button
            type="button"
            className="btn-primary flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            New project
          </button>
        }
      />

      <FilterPills items={filterItems} />

      <div className="space-y-2">
        {filteredProjects.map((project) => {
          const domain = getDomain(project.domainId);
          return (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="card card-hover flex items-center gap-4 p-5"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-2">
                <FolderKanban className="h-4 w-4 text-muted" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-ink">
                    {project.name}
                  </h3>
                  {domain && (
                    <span className="rounded-md border border-border bg-surface-2 px-2 py-0.5 text-xs text-faint">
                      {domain.name}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-muted">
                  {project.description}
                </p>
                <div className="mt-2 flex items-center gap-4 text-xs text-faint">
                  <span className="flex items-center gap-1">
                    <Folder className="h-3 w-3" />
                    {project.folderCount} folders
                  </span>
                  <span>{project.promptCount} prompts</span>
                  <span>Updated {formatDate(project.updatedAt)}</span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-faint" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
