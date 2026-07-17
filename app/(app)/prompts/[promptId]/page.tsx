import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, GitCompare } from "lucide-react";
import PromptEditor from "@/components/workspace/PromptEditor";
import Timeline from "@/components/workspace/Timeline";
import { getPrompt, getProject } from "@/lib/mock-data";

export const metadata = {
  title: "Prompt",
};

interface PromptDetailPageProps {
  params: Promise<{ promptId: string }>;
}

export default async function PromptDetailPage({
  params,
}: PromptDetailPageProps) {
  const { promptId } = await params;
  const prompt = getPrompt(promptId);
  if (!prompt) notFound();

  const project = getProject(prompt.projectId);
  const latestVersion = prompt.versions[prompt.versions.length - 1];

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/prompts"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)]"
        >
          <ArrowLeft className="h-4 w-4" />
          All prompts
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--color-ink)]">
              {prompt.title}
            </h1>
            {project && (
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                {project.name}
              </p>
            )}
          </div>
          <Link
            href="/compare"
            className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-muted)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-ink)]"
          >
            <GitCompare className="h-4 w-4" />
            Compare models
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <PromptEditor prompt={prompt} />
          {latestVersion && (
            <div className="card p-4">
              <h3 className="mb-2 text-sm font-semibold text-[var(--color-ink)]">
                Latest output
              </h3>
              <p className="text-sm leading-relaxed text-[var(--color-muted)]">
                {latestVersion.output}
              </p>
              <div className="mt-3 flex items-center gap-4 text-xs text-[var(--color-faint)]">
                <span>{latestVersion.model}</span>
                <span>${latestVersion.cost.toFixed(3)}</span>
                <span>
                  {latestVersion.tokensIn + latestVersion.tokensOut} tokens
                </span>
              </div>
            </div>
          )}
        </div>
        <Timeline versions={prompt.versions} />
      </div>
    </div>
  );
}
