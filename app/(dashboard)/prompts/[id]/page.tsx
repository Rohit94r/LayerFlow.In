import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, History } from "@/components/ui/icons";
import { Panel, PanelHeader, PanelBody } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { RadialScore } from "@/components/ui/charts";
import { PromptActions } from "@/components/features/prompts/prompt-actions";
import { promptService } from "@/lib/services/prompts";
import { timeAgo } from "@/lib/data/providers";

export default async function PromptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const prompt = await promptService.getPrompt(id);
  if (!prompt) notFound();

  const subScores = [
    { label: "Clarity", value: 94 },
    { label: "Context", value: 92 },
    { label: "Format", value: 90 },
    { label: "Constraints", value: 95 },
    { label: "Efficiency", value: 88 },
    { label: "Model fit", value: 91 },
  ];

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
            <Badge tone="mint">v{prompt.version}</Badge>
            <Badge tone="neutral">best on {prompt.model}</Badge>
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
          <PanelHeader title="Prompt" description={`Version ${prompt.version} · scored ${prompt.score}/100`} />
          <PanelBody>
            <pre className="whitespace-pre-wrap rounded-xl border border-border bg-[#0d1117] p-5 font-mono text-[13px] leading-relaxed text-emerald-100/90">
              {prompt.content}
            </pre>
          </PanelBody>
        </Panel>

        <div className="space-y-5">
          <Panel>
            <PanelHeader title="Prompt Score" />
            <PanelBody className="flex flex-col items-center">
              <RadialScore value={prompt.score} size={104} />
              <div className="mt-4 grid w-full grid-cols-2 gap-x-4 gap-y-1.5">
                {subScores.map((s) => (
                  <span key={s.label} className="flex items-center justify-between text-[11px]">
                    <span className="text-muted">{s.label}</span>
                    <span className="font-semibold text-ink">{s.value}</span>
                  </span>
                ))}
              </div>
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader title="Before improvement" description="Your original paste" />
            <PanelBody>
              <p className="rounded-xl border border-border bg-surface-2/40 p-3.5 text-xs italic leading-relaxed text-faint">
                “{prompt.originalContent}”
              </p>
              <p className="mt-3 flex items-center gap-1.5 text-[11px] text-faint">
                <History className="h-3.5 w-3.5" /> v{prompt.version} of {Math.max(prompt.version, 3)} saved versions
              </p>
            </PanelBody>
          </Panel>
        </div>
      </div>
    </div>
  );
}
