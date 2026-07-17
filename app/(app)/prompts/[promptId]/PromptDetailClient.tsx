"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, GitCompare } from "lucide-react";
import PromptEditor from "@/components/workspace/PromptEditor";
import Timeline from "@/components/workspace/Timeline";
import { getProject, getDomain } from "@/lib/mock-data";
import type { Prompt, PromptVersion } from "@/lib/types";

interface PromptDetailClientProps {
  prompt: Prompt;
}

export default function PromptDetailClient({ prompt }: PromptDetailClientProps) {
  const [versions, setVersions] = useState(prompt.versions);
  const project = getProject(prompt.projectId);
  const domain = getDomain(prompt.domainId);
  const latestVersion = versions[versions.length - 1];
  const totalCost = versions.reduce((sum, v) => sum + v.cost, 0);
  const totalTokens = versions.reduce((sum, v) => sum + v.tokensIn + v.tokensOut, 0);

  const handleVersionCreated = (version: PromptVersion) => {
    setVersions((prev) => [...prev, version]);
  };

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
        <Link href="/compare" className="btn-secondary">
          <GitCompare className="h-4 w-4" />
          Compare models
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <PromptEditor prompt={prompt} onVersionCreated={handleVersionCreated} />
          {latestVersion && (
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-ink">Latest output</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{latestVersion.output}</p>
              <div className="mt-3 flex items-center gap-4 text-xs text-faint">
                <span>{latestVersion.model}</span>
                <span>${latestVersion.cost.toFixed(3)}</span>
                <span>{latestVersion.tokensIn + latestVersion.tokensOut} tokens</span>
                <span>v{latestVersion.version}</span>
              </div>
            </div>
          )}
        </div>
        <Timeline versions={versions} onVersionsChange={setVersions} />
      </div>
    </div>
  );
}
