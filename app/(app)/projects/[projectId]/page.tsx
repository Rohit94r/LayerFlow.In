import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus, Folder, ArrowLeft } from "lucide-react";
import PromptList from "@/components/workspace/PromptList";
import {
  getProject,
  getDomain,
  getFoldersForProject,
  getPromptsForProject,
} from "@/lib/mock-data";

export const metadata = {
  title: "Project",
};

interface ProjectDetailPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectDetailPage({
  params,
}: ProjectDetailPageProps) {
  const { projectId } = await params;
  const project = getProject(projectId);
  if (!project) notFound();

  const domain = getDomain(project.domainId);
  const projectFolders = getFoldersForProject(projectId);
  const projectPrompts = getPromptsForProject(projectId);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/projects"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)]"
        >
          <ArrowLeft className="h-4 w-4" />
          All projects
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-[var(--color-ink)]">
                {project.name}
              </h1>
              {domain && (
                <span
                  className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                  style={{
                    backgroundColor: `${domain.color}18`,
                    color: domain.color,
                  }}
                >
                  {domain.name}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              {project.description}
            </p>
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-muted)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-ink)]">
              <Plus className="h-4 w-4" />
              New folder
            </button>
            <button className="btn-primary flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium">
              <Plus className="h-4 w-4" />
              New prompt
            </button>
          </div>
        </div>
      </div>

      {projectFolders.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-[var(--color-ink)]">
            Folders
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {projectFolders.map((folder) => (
              <div
                key={folder.id}
                className="card card-hover flex items-center gap-3 p-4"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-surface-2)]">
                  <Folder className="h-4 w-4 text-[var(--color-brand)]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--color-ink)]">
                    {folder.name}
                  </p>
                  <p className="text-xs text-[var(--color-faint)]">
                    {folder.promptCount} prompts
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-ink)]">
          Prompts
        </h2>
        <PromptList prompts={projectPrompts} />
      </section>
    </div>
  );
}
