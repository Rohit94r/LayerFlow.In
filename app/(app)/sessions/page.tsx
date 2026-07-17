import { Plus } from "lucide-react";
import SessionList from "@/components/workspace/SessionList";
import PageHeader from "@/components/workspace/PageHeader";
import { sessions } from "@/lib/mock-data";

export const metadata = {
  title: "Sessions",
};

export default function SessionsPage() {
  const sorted = [...sessions].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Prompt Workspace"
        title="Sessions"
        description="Chained prompt workflows — resume builders, launch copy, coding sprints."
        actions={
          <button type="button" className="btn-primary flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium">
            <Plus className="h-4 w-4" />
            New session
          </button>
        }
      />

      <SessionList sessions={sorted} />
    </div>
  );
}
