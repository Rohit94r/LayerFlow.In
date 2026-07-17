import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus, Folder, ArrowLeft } from "lucide-react";
import PromptList from "@/components/workspace/PromptList";
import PageHeader from "@/components/workspace/PageHeader";
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
      <Link
        href="/projects"
        className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        All projects
      </Link>

      <PageHeader
        eyebrow={domain?.name ?? "Project"}
        title={project.name}
        description={project.description}
        actions={
          <div className="flex gap-2">
            <button type="button" className="btn-secondary">
              <Plus className="h-4 w-4" />
              New folder
            </button>
            <button
              type="button"
              className="btn-primary flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium"
            >
              <Plus className="h-4 w-4" />
              New prompt
            </button>
          </div>
        }
      />

      {projectFolders.length > 0 && (
        <section>
          <h2 className="section-label mb-3">Folders</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {projectFolders.map((folder) => (
              <div
                key={folder.id}
                className="card card-hover flex items-center gap-3 p-4"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-2">
                  <Folder className="h-4 w-4 text-muted" />
                </div>
                <div>
                  <p className="text-sm font-medium text-ink">{folder.name}</p>
                  <p className="text-xs text-faint">
                    {folder.promptCount} prompts
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="section-label mb-3">Prompts</h2>
        <PromptList prompts={projectPrompts} />
      </section>
    </div>
  );
}
