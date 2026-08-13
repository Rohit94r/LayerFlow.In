import { Brain, Sparkles } from "@/components/ui/icons";
import { PageHeader } from "@/components/shared/page-header";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { memoryService } from "@/lib/services/memory";
import { AddMemoryForm } from "@/components/features/memory/add-memory-form";
import { timeAgo } from "@/lib/data/providers";

const SOURCE_LABEL: Record<string, string> = {
  prompt: "Prompt",
  session: "Session",
  run: "Run",
  manual: "Manual",
  chat: "Chat",
};

export default async function MemoryPage() {
  const memories = (await memoryService.list({ limit: 200 })).memories;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Memory"
        description="Long-term context LayerFlow retrieves into future prompts."
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel>
            <PanelHeader title="All memories" description="Newest first" />
            <PanelBody className="p-0">
              {memories.length > 0 ? (
                <ul className="divide-y divide-border">
                  {memories.map((m) => (
                    <li key={m.id} className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-[13px] font-semibold text-ink">{m.title}</p>
                        <Badge tone="neutral">{SOURCE_LABEL[m.sourceType] ?? m.sourceType}</Badge>
                        <span className="ml-auto shrink-0 text-[10px] text-faint">
                          {timeAgo(m.createdAt)}
                        </span>
                      </div>
                      {m.body ? (
                        <p className="mt-1.5 line-clamp-3 text-[12px] leading-relaxed text-ink/70">
                          {m.body}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-5 py-10">
                  <EmptyState
                    icon={<Brain className="h-5 w-5" />}
                    title="No memories yet"
                    description="Save a chat moment or add one manually — LayerFlow pulls it into future prompts automatically."
                  />
                </div>
              )}
            </PanelBody>
          </Panel>
        </div>

        <div className="space-y-5">
          <AddMemoryForm />

          <Panel>
            <PanelHeader title="How memory works" action={<Sparkles className="h-4 w-4 text-faint" />} />
            <PanelBody className="space-y-2.5 text-[12px] leading-relaxed text-ink/70">
              <p>
                Memories are matched against every new prompt with hybrid keyword + semantic search
                and injected as context automatically.
              </p>
              <p>
                Prefer short, factual entries — details that hold true across weeks — over
                one-off conversation snippets.
              </p>
            </PanelBody>
          </Panel>
        </div>
      </div>
    </div>
  );
}
