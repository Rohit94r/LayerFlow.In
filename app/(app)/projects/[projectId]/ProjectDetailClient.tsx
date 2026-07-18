"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Plus, Folder } from "lucide-react";
import PageHeader from "@/components/workspace/PageHeader";
import PromptList from "@/components/workspace/PromptList";
import { ErrorState, LoadingState } from "@/components/workspace/DataState";
import { useAsyncData, errorMessage } from "@/lib/hooks/use-async-data";
import {
  listProjects,
  listFolders,
  listPrompts,
  listDomains,
  createFolder,
  createPrompt,
} from "@/lib/api";
import { mapDomain, mapProject, mapPrompt } from "@/lib/api/mappers";

async function loadProjectDetail(projectId: string) {
  const [projectsRes, foldersRes, promptsRes, domainsRes] = await Promise.all([
    listProjects(),
    listFolders({ projectId }),
    listPrompts({ projectId, limit: 100 }),
    listDomains(),
  ]);
  const projectRow = projectsRes.projects.find((p) => p.id === projectId);
  if (!projectRow) throw new Error("Project not found");
  const prompts = promptsRes.prompts.map((p) => mapPrompt(p));
  const folders = foldersRes.folders.map((f) => ({
    id: f.id,
    projectId: f.projectId,
    name: f.name,
    promptCount: prompts.filter((p) => p.folderId === f.id).length,
  }));
  return {
    project: mapProject(projectRow, {
      folderCount: folders.length,
      promptCount: prompts.length,
    }),
    folders,
    prompts,
    domains: domainsRes.domains.map((d) => mapDomain(d)),
    projects: projectsRes.projects.map((p) => mapProject(p)),
  };
}

export default function ProjectDetailClient({ projectId }: { projectId: string }) {
  const router = useRouter();
  const state = useAsyncData(() => loadProjectDetail(projectId), [projectId]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (state.status === "loading") return <LoadingState label="Loading project…" />;
  if (state.status === "error") {
    return <ErrorState message={errorMessage(state.error)} onRetry={state.reload} />;
  }

  const { project, folders, prompts, domains, projects } = state.data;
  const domain = domains.find((d) => d.id === project.domainId);

  const handleNewFolder = async () => {
    setBusy("folder");
    setError(null);
    try {
      await createFolder({ projectId, name: "New folder" });
      state.reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const handleNewPrompt = async () => {
    setBusy("prompt");
    setError(null);
    try {
      const res = await createPrompt({
        title: "Untitled prompt",
        body: "Write your prompt here…",
        projectId,
        domainId: project.domainId,
      });
      router.push(`/prompts/${res.prompt.id}`);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <Link
        href="/projects"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        All projects
      </Link>

      <PageHeader
        eyebrow={domain?.name ?? "Project"}
        title={project.name}
        description={project.description || "Project prompts and folders."}
        actions={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleNewFolder}
              disabled={busy === "folder"}
              className="btn-secondary rounded-lg px-3 py-2 text-sm disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              New folder
            </button>
            <button
              type="button"
              onClick={handleNewPrompt}
              disabled={busy === "prompt"}
              className="btn-primary flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              New prompt
            </button>
          </div>
        }
      />

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">
          {error}
        </p>
      )}

      <section>
        <h2 className="section-label mb-3">Folders</h2>
        {folders.length === 0 ? (
          <p className="text-sm text-muted">No folders yet.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {folders.map((folder) => (
              <div key={folder.id} className="card flex items-center gap-3 p-4">
                <Folder className="h-4 w-4 text-muted" />
                <div>
                  <p className="text-sm font-medium text-ink">{folder.name}</p>
                  <p className="text-xs text-faint">{folder.promptCount} prompts</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="section-label mb-3">Prompts</h2>
        <PromptList prompts={prompts} domains={domains} projects={projects} />
      </section>
    </div>
  );
}
