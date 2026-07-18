"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ErrorState, LoadingState } from "@/components/workspace/DataState";
import { useAsyncData, errorMessage } from "@/lib/hooks/use-async-data";
import { getSession, listDomains, listProjects, getPrompt } from "@/lib/api";
import { mapDomain, mapProject, mapSession, mapPrompt } from "@/lib/api/mappers";

async function loadSessionDetail(sessionId: string) {
  const [detail, domainsRes, projectsRes] = await Promise.all([
    getSession(sessionId),
    listDomains(),
    listProjects(),
  ]);
  const session = mapSession(detail.session, detail.messages);
  const promptIds = session.promptIds;
  const prompts = [];
  for (const id of promptIds) {
    try {
      const res = await getPrompt(id);
      prompts.push(mapPrompt(res.prompt, res.currentVersion));
    } catch {
      // skip missing
    }
  }
  return {
    session,
    messages: detail.messages,
    prompts,
    domains: domainsRes.domains.map((d) => mapDomain(d)),
    projects: projectsRes.projects.map((p) => mapProject(p)),
  };
}

export default function SessionDetailClient({ sessionId }: { sessionId: string }) {
  const state = useAsyncData(() => loadSessionDetail(sessionId), [sessionId]);

  if (state.status === "loading") return <LoadingState label="Loading session…" />;
  if (state.status === "error") {
    return <ErrorState message={errorMessage(state.error)} onRetry={state.reload} />;
  }

  const { session, messages, prompts, domains, projects } = state.data;
  const domain = domains.find((d) => d.id === session.domainId);
  const project = projects.find((p) => p.id === session.projectId);

  return (
    <div className="space-y-6">
      <Link
        href="/sessions"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        All sessions
      </Link>

      <div>
        <p className="text-sm text-brand">Prompt session</p>
        <h1 className="text-xl font-semibold text-ink">{session.title}</h1>
        <p className="mt-1 text-sm text-muted">
          {[domain?.name, project?.name, session.status].filter(Boolean).join(" · ")}
        </p>
        {session.description && (
          <p className="mt-2 text-sm text-muted">{session.description}</p>
        )}
      </div>

      <section className="card divide-y divide-border">
        <div className="px-4 py-3">
          <h2 className="text-sm font-semibold text-ink">Messages</h2>
        </div>
        {messages.length === 0 ? (
          <p className="px-4 py-8 text-sm text-muted">
            No messages yet. Run prompts and append them to this session from the API
            or continue from linked prompts below.
          </p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-faint">
                {m.role}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-ink">{m.body}</p>
            </div>
          ))
        )}
      </section>

      {prompts.length > 0 && (
        <section>
          <h2 className="section-label mb-3">Linked prompts</h2>
          <div className="space-y-2">
            {prompts.map((p) => (
              <Link
                key={p.id}
                href={`/prompts/${p.id}`}
                className="card card-hover block p-4"
              >
                <p className="text-sm font-medium text-ink">{p.title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-muted">{p.content}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
