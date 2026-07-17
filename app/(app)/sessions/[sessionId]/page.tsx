import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Play, ArrowRight, MessageSquare } from "lucide-react";
import { getSession, getPromptsForSession, getDomain, getProject } from "@/lib/mock-data";

export const metadata = {
  title: "Session",
};

interface SessionDetailPageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function SessionDetailPage({ params }: SessionDetailPageProps) {
  const { sessionId } = await params;
  const session = getSession(sessionId);
  if (!session) notFound();

  const sessionPrompts = getPromptsForSession(sessionId);
  const domain = getDomain(session.domainId);
  const project = session.projectId ? getProject(session.projectId) : null;

  return (
    <div className="space-y-6">
      <Link
        href="/sessions"
        className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        All sessions
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-brand">Prompt Session</p>
          <h1 className="text-xl font-semibold tracking-tight text-ink">{session.title}</h1>
          {session.description && (
            <p className="mt-1 text-sm text-muted">{session.description}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-faint">
            {domain && <span>{domain.name}</span>}
            {project && <span>· {project.name}</span>}
            <span>· ${session.totalCost.toFixed(3)} total</span>
            <span>· {session.totalTokens} tokens</span>
            <span className="capitalize">· {session.status}</span>
          </div>
        </div>
        <button type="button" className="btn-primary flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium">
          <Play className="h-4 w-4" />
          Continue session
        </button>
      </div>

      <div className="card p-4">
        <p className="text-xs font-medium text-muted">Session flow</p>
        <p className="mt-0.5 text-sm text-ink">
          {sessionPrompts.length} prompts in sequence — outputs feed into the next step.
        </p>
      </div>

      <div className="space-y-4">
        {sessionPrompts.map((prompt, index) => {
          const latestVersion = prompt.versions[prompt.versions.length - 1];
          const isLast = index === sessionPrompts.length - 1;

          return (
            <div key={prompt.id}>
              <div className="card overflow-hidden">
                <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-brand/30 bg-brand/10 text-xs font-medium text-brand">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/prompts/${prompt.id}`}
                      className="text-sm font-semibold text-ink hover:text-brand"
                    >
                      {prompt.title}
                    </Link>
                    <p className="text-xs text-faint">{prompt.model}</p>
                  </div>
                  <Link href={`/prompts/${prompt.id}`} className="btn-secondary text-xs">
                    Open
                  </Link>
                </div>

                <div className="px-4 py-3">
                  <p className="font-mono text-sm text-muted">{prompt.content}</p>
                </div>

                {latestVersion && (
                  <div className="border-t border-border bg-surface-2 px-4 py-3">
                    <p className="text-xs font-medium text-muted">Output</p>
                    <p className="mt-1 text-sm leading-relaxed text-ink">{latestVersion.output}</p>
                    <p className="mt-2 text-xs text-faint">
                      {latestVersion.model} · ${latestVersion.cost.toFixed(3)} ·{" "}
                      {latestVersion.tokensIn + latestVersion.tokensOut} tokens
                    </p>
                  </div>
                )}
              </div>

              {!isLast && (
                <div className="flex justify-center py-2">
                  <ArrowRight className="h-4 w-4 rotate-90 text-faint" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="card flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-5 w-5 text-brand" />
          <div>
            <p className="text-sm font-medium text-ink">Continue this session</p>
            <p className="text-xs text-muted">Run the next prompt or add a new step</p>
          </div>
        </div>
        <button type="button" className="btn-primary flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium">
          <Play className="h-4 w-4" />
          Continue
        </button>
      </div>
    </div>
  );
}
