import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@/components/ui/icons";
import { Panel, PanelHeader, PanelBody } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { PromptActions } from "@/components/features/prompts/prompt-actions";
import { promptService } from "@/lib/services/prompts";
import { timeAgo } from "@/lib/data/providers";

export default async function PromptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const prompt = await promptService.getPrompt(id);
  if (!prompt) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/prompts"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Prompt Library
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            {prompt.tags.map((t) => (
              <Badge key={t} tone="neutral">
                #{t}
              </Badge>
            ))}
            {prompt.version != null ? <Badge tone="mint">v{prompt.version}</Badge> : null}
            {prompt.model ? <Badge tone="neutral">best on {prompt.model}</Badge> : null}
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink">{prompt.title}</h1>
          <p className="mt-1.5 text-xs text-faint">
            Improved {timeAgo(prompt.updatedAt)} · used {prompt.usageCount}× ·{" "}
            {prompt.content.split(/\s+/).length.toLocaleString()} words
          </p>
        </div>
        <PromptActions content={prompt.content} />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelHeader
            title="Prompt"
            description={prompt.version != null ? `Version ${prompt.version}` : prompt.source === "improve" ? "Improved prompt" : "Saved prompt"}
          />
          <PanelBody>
            <pre className="whitespace-pre-wrap rounded-xl border border-border bg-[#0d1117] p-5 font-mono text-[13px] leading-relaxed text-emerald-100/90">
              {prompt.content}
            </pre>
          </PanelBody>
        </Panel>

        <div className="space-y-5">
          <Panel>
            <PanelHeader title="Prompt details" />
            <PanelBody className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted">Source</span>
                <span className="font-semibold capitalize text-ink">{prompt.source}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">Times used</span>
                <span className="font-semibold text-ink">{prompt.usageCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">Tags</span>
                <span className="font-semibold text-ink">{prompt.tags.join(", ") || "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">Updated</span>
                <span className="font-semibold text-ink">{timeAgo(prompt.updatedAt)}</span>
              </div>
            </PanelBody>
          </Panel>

          {prompt.originalContent ? (
            <Panel>
              <PanelHeader title="Before improvement" description="Your original paste" />
              <PanelBody>
                <p className="rounded-xl border border-border bg-surface-2/40 p-3.5 text-xs italic leading-relaxed text-faint">
                  “{prompt.originalContent}”
                </p>
              </PanelBody>
            </Panel>
          ) : null}
        </div>
      </div>
    </div>
  );
}
