import Link from "next/link";
import { MessageSquare, Clock, DollarSign, ArrowRight } from "lucide-react";
import type { PromptSession } from "@/lib/types";
import { getDomain } from "@/lib/mock-data";

interface SessionListProps {
  sessions: PromptSession[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

const statusStyles = {
  active: "border-brand/30 bg-brand/10 text-brand",
  completed: "border-border bg-surface-2 text-muted",
  paused: "border-border bg-surface-2 text-faint",
};

export default function SessionList({ sessions }: SessionListProps) {
  if (sessions.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center px-6 py-16 text-center">
        <MessageSquare className="h-8 w-8 text-faint" />
        <p className="mt-3 text-sm text-muted">No sessions yet</p>
        <p className="mt-1 text-xs text-faint">
          Chain prompts together for multi-step workflows
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
      {sessions.map((session) => {
        const domain = getDomain(session.domainId);
        return (
          <Link
            key={session.id}
            href={`/sessions/${session.id}`}
            className="card-hover flex items-start gap-4 px-4 py-4 transition-colors"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-2">
              <MessageSquare className="h-4 w-4 text-brand" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-sm font-semibold text-ink">
                  {session.title}
                </h3>
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${statusStyles[session.status]}`}
                >
                  {session.status}
                </span>
              </div>
              {session.description && (
                <p className="mt-0.5 line-clamp-1 text-sm text-muted">
                  {session.description}
                </p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-faint">
                <span>{session.promptIds.length} prompts</span>
                {domain && <span>{domain.name}</span>}
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDate(session.updatedAt)}
                </span>
                <span className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  ${session.totalCost.toFixed(3)}
                </span>
              </div>
            </div>
            <ArrowRight className="mt-2 h-4 w-4 shrink-0 text-faint" />
          </Link>
        );
      })}
    </div>
  );
}
