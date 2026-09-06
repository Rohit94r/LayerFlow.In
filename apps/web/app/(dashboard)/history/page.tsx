import { PageHeader } from "@/components/shared/page-header";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/empty-state";
import { History } from "@/components/ui/icons";
import { Timeline } from "@/components/features/history/timeline";
import { workspaceService } from "@/lib/services/workspace";

export default async function HistoryPage() {
  const [events, learnings] = await Promise.all([
    workspaceService.listTimeline(),
    workspaceService.listLearnings(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Work Ledger"
        description="Every rescue, prompt, learning, decision and cost — one time-ordered record of your AI work."
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelHeader title="Recent activity" description="Most recent first" />
          <PanelBody>
            {events.length ? (
              <Timeline events={events} />
            ) : (
              <EmptyState
                icon={<History className="h-5 w-5" />}
                title="No activity yet"
                description="Rescue a chat or run a prompt and it will show up here."
              />
            )}
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader title="Learning Memory" description="What LayerFlow remembered" />
          <PanelBody className="space-y-3">
            {learnings.length ? (
              learnings.map((l) => (
                <div key={l.id} className="rounded-xl border border-border bg-surface-2/40 p-3.5">
                  <p className="text-xs leading-relaxed text-ink/90">{l.content}</p>
                  <p className="mt-2 text-[10px] text-faint">{l.source}</p>
                </div>
              ))
            ) : (
              <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-faint">
                Nothing learned yet.
              </p>
            )}
          </PanelBody>
        </Panel>
      </div>
    </div>
  );
}
