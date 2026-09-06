import { Suspense } from "react";
import { workspaceService } from "@/lib/services/workspace";
import { Skeleton } from "@/components/ui/skeleton";
import WorkspaceClient from "@/components/features/workspace/workspace-client";

export default async function WorkspacePage() {
  const [projects, timeline, learnings, domains] = await Promise.all([
    workspaceService.listProjects(),
    workspaceService.listTimeline(),
    workspaceService.listLearnings(),
    workspaceService.listDomains(),
  ]);

  return (
    <Suspense fallback={<Skeleton className="h-64 w-full rounded-2xl" />}>
      <WorkspaceClient projects={projects} timeline={timeline} learnings={learnings} domains={domains} />
    </Suspense>
  );
}
