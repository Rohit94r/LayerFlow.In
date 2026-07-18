"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Plus, FolderKanban, Folder, ChevronRight } from "lucide-react";
import PageHeader from "@/components/workspace/PageHeader";
import FilterPills from "@/components/workspace/FilterPills";
import { ErrorState, LoadingState } from "@/components/workspace/DataState";
import { useAsyncData, errorMessage } from "@/lib/hooks/use-async-data";
import {
  listDomains,
  listProjects,
  listFolders,
  listPrompts,
  createProject,
} from "@/lib/api";
import { mapDomain, mapProject } from "@/lib/api/mappers";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

async function loadProjects() {
  const [domainsRes, projectsRes, promptsRes, foldersRes] = await Promise.all([
    listDomains(),
    listProjects(),
    listPrompts({ limit: 100 }),
    listFolders(),
  ]);
  const domains = domainsRes.domains.map((d) => mapDomain(d));
  const projects = projectsRes.projects.map((p) => {
    const folderCount = foldersRes.folders.filter((f) => f.projectId === p.id).length;
    const promptCount = promptsRes.prompts.filter((pr) => pr.projectId === p.id).length;
    return mapProject(p, { folderCount, promptCount });
  });
  return { domains, projects };
}

export default function ProjectsClient() {
  const searchParams = useSearchParams();
  const domainFilter = searchParams.get("domain") ?? undefined;
  const router = useRouter();
  const state = useAsyncData(loadProjects, []);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (state.status === "loading") return <LoadingState label="Loading projects…" />;
  if (state.status === "error") {
    return <ErrorState message={errorMessage(state.error)} onRetry={state.reload} />;
  }

  const { domains, projects } = state.data;
  const filtered = domainFilter
    ? projects.filter((p) => p.domainId === domainFilter)
    : projects;
  const activeDomain = domainFilter
    ? domains.find((d) => d.id === domainFilter)
    : undefined;

  const filterItems = [
    { label: "All", href: "/projects", active: !domainFilter },
    ...domains.map((d) => ({
      label: d.name,
      href: `/projects?domain=${d.id}`,
      active: domainFilter === d.id,
    })),
  ];

  const handleCreate = async () => {
    const domain = activeDomain ?? domains[0];
    if (!domain) {
      setError("Create a domain first (auto-created on first login).");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const res = await createProject({
        domainId: domain.id,
        name: "New project",
        description: "Describe this project",
      });
      router.push(`/projects/${res.project.id}`);
    } catch (err) {
      setError(errorMessage(err));
      setCreating(false);
    }
  };

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
            onClick={handleCreate}
            disabled={creating}
            className="btn-primary flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            {creating ? "Creating…" : "New project"}
          </button>
        }
      />

      <FilterPills items={filterItems} />

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">
          {error}
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="card px-6 py-16 text-center text-sm text-muted">
          No projects yet. Create one to organize prompts.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((project) => {
            const domain = domains.find((d) => d.id === project.domainId);
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
                    <h3 className="text-sm font-semibold text-ink">{project.name}</h3>
                    {domain && (
                      <span className="rounded-md border border-border bg-surface-2 px-2 py-0.5 text-xs text-faint">
                        {domain.name}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-muted">{project.description}</p>
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
      )}
    </div>
  );
}
