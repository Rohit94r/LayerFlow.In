"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, GitCompare } from "lucide-react";
import PromptEditor from "@/components/workspace/PromptEditor";
import Timeline from "@/components/workspace/Timeline";
import { ErrorState, LoadingState } from "@/components/workspace/DataState";
import { useAsyncData, errorMessage } from "@/lib/hooks/use-async-data";
import {
  getPrompt,
  listPromptVersions,
  listDomains,
  listProjects,
  listRuns,
  getRun,
} from "@/lib/api";
import { mapDomain, mapProject, mapPrompt, mapPromptVersion } from "@/lib/api/mappers";
import type { PromptVersion } from "@/lib/types";

interface PromptDetailClientProps {
  promptId: string;
}

async function loadPromptDetail(promptId: string) {
  const [promptRes, versionsRes, domainsRes, projectsRes] = await Promise.all([
    getPrompt(promptId),
    listPromptVersions(promptId),
    listDomains(),
    listProjects(),
  ]);

  const versions: PromptVersion[] = [];
  for (const v of versionsRes.versions) {
    const runs = await listRuns({ promptVersionId: v.id, limit: 1 });
    let output = null;
    if (runs.runs[0]) {
      try {
        const detail = await getRun(runs.runs[0].id);
        if (detail.run.output) {
          output = {
            id: detail.run.id,
            promptVersionId: v.id,
            runId: detail.run.id,
            model: detail.run.model,
            provider: detail.run.provider,
            body: detail.run.output,
            inputTokens: detail.run.inputTokens,
            outputTokens: detail.run.outputTokens,
            costMicro: detail.run.costMicro,
            createdAt: detail.run.createdAt,
          };
        }
      } catch {
        // ignore missing output
      }
    }
    versions.push(mapPromptVersion(v, output));
  }

  const prompt = mapPrompt(promptRes.prompt, promptRes.currentVersion, versions);
  return {
    prompt,
    versions,
    domains: domainsRes.domains.map((d) => mapDomain(d)),
    projects: projectsRes.projects.map((p) => mapProject(p)),
  };
}

export default function PromptDetailClient({ promptId }: PromptDetailClientProps) {
  const state = useAsyncData(() => loadPromptDetail(promptId), [promptId]);
  const [versions, setVersions] = useState<PromptVersion[] | null>(null);
  const [title, setTitle] = useState<string | null>(null);
  const [latestOutput, setLatestOutput] = useState<string | null>(null);

  if (state.status === "loading") return <LoadingState label="Loading prompt…" />;
  if (state.status === "error") {
    return <ErrorState message={errorMessage(state.error)} onRetry={state.reload} />;
  }

  const data = state.data;
  const currentVersions = versions ?? data.versions;
  const prompt = {
    ...data.prompt,
    title: title ?? data.prompt.title,
    versions: currentVersions,
    content: currentVersions[currentVersions.length - 1]?.content ?? data.prompt.content,
  };
  const project = data.projects.find((p) => p.id === prompt.projectId);
  const domain = data.domains.find((d) => d.id === prompt.domainId);
  const latestVersion = currentVersions[currentVersions.length - 1];
  const totalCost = currentVersions.reduce((sum, v) => sum + v.cost, 0);
  const totalTokens = currentVersions.reduce(
    (sum, v) => sum + v.tokensIn + v.tokensOut,
    0,
  );

  return (
    <div className="space-y-6">
      <Link
        href="/prompts"
        className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        All prompts
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-brand">Prompt Workspace</p>
          <h1 className="text-xl font-semibold tracking-tight text-ink">{prompt.title}</h1>
          <div className="mt-1 flex flex-wrap gap-2 text-sm text-muted">
            {project && <span>{project.name}</span>}
            {domain && <span>· {domain.name}</span>}
            <span>· ${totalCost.toFixed(3)} total</span>
            <span>· {totalTokens} tokens</span>
          </div>
        </div>
        <Link
          href={`/compare?promptId=${prompt.id}${latestVersion ? `&versionId=${latestVersion.id}` : ""}`}
          className="btn-secondary"
        >
          <GitCompare className="h-4 w-4" />
          Compare models
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <PromptEditor
            prompt={prompt}
            onVersionCreated={(version) => {
              setVersions((prev) => [...(prev ?? data.versions), version]);
            }}
            onPromptUpdated={setTitle}
            onRunComplete={(output) => setLatestOutput(output)}
          />
          {(latestOutput || latestVersion?.output) && (
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-ink">Latest output</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted">
                {latestOutput ?? latestVersion?.output}
              </p>
              {latestVersion && (
                <div className="mt-3 flex items-center gap-4 text-xs text-faint">
                  <span>{latestVersion.model}</span>
                  <span>${latestVersion.cost.toFixed(3)}</span>
                  <span>
                    {latestVersion.tokensIn + latestVersion.tokensOut} tokens
                  </span>
                  <span>v{latestVersion.version}</span>
                </div>
              )}
            </div>
          )}
        </div>
        <Timeline
          promptId={prompt.id}
          versions={currentVersions}
          onVersionsChange={setVersions}
          onRestored={(version) => {
            setVersions((prev) => [...(prev ?? data.versions), version]);
          }}
        />
      </div>
    </div>
  );
}
