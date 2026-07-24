"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Send, Play, Loader2, User, Bot } from "lucide-react";
import { ErrorState, LoadingState } from "@/components/workspace/DataState";
import { useAsyncData, errorMessage } from "@/lib/hooks/use-async-data";
import {
  getSession,
  listDomains,
  listProjects,
  getPrompt,
  appendSessionMessage,
  createRun,
} from "@/lib/api";
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
      prompts.push(mapPrompt(res.prompt, res.currentVersion, [], res.variables));
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
  const [composerText, setComposerText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (state.status === "loading") return <LoadingState label="Loading session…" />;
  if (state.status === "error") {
    return <ErrorState message={errorMessage(state.error)} onRetry={state.reload} />;
  }

  const { session, messages, prompts, domains, projects } = state.data;
  const domain = domains.find((d) => d.id === session.domainId);
  const project = projects.find((p) => p.id === session.projectId);

  const handleSend = async () => {
    const text = composerText.trim();
    if (!text) return;
    setSending(true);
    setError(null);
    try {
      await appendSessionMessage(sessionId, {
        role: "user",
        body: text,
      });
      setComposerText("");
      setMessage("Message added");
      state.reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  const handleRunPrompt = async (promptId: string, content: string) => {
    setSending(true);
    setError(null);
    try {
      await appendSessionMessage(sessionId, {
        role: "user",
        body: content,
      });
      const runRes = await createRun({
        promptId,
        model: "gpt-4o",
        source: "playground",
      });
      if (runRes.run.output) {
        await appendSessionMessage(sessionId, {
          role: "assistant",
          body: runRes.run.output,
        });
      }
      setMessage("Prompt run complete");
      state.reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  const sortedMessages = [...messages].sort(
    (a, b) => (a.position ?? 0) - (b.position ?? 0),
  );

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

      {(error || message) && (
        <p
          className={`rounded-lg border px-3 py-2 text-sm ${
            error
              ? "border-red-500/30 bg-red-500/10 text-red-500"
              : "border-brand/30 bg-brand/10 text-brand"
          }`}
        >
          {error ?? message}
        </p>
      )}

      <section className="card divide-y divide-border">
        <div className="px-4 py-3">
          <h2 className="text-sm font-semibold text-ink">
            Messages ({messages.length})
          </h2>
        </div>
        {sortedMessages.length === 0 ? (
          <p className="px-4 py-8 text-sm text-muted">
            No messages yet. Type below or run a linked prompt to start the
            conversation.
          </p>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto">
            {sortedMessages.map((m) => (
              <div key={m.id} className="px-4 py-3">
                <div className="mb-1 flex items-center gap-2">
                  {m.role === "user" ? (
                    <User className="h-3.5 w-3.5 text-brand" />
                  ) : (
                    <Bot className="h-3.5 w-3.5 text-muted" />
                  )}
                  <p className="text-xs font-medium uppercase tracking-wide text-faint">
                    {m.role}
                  </p>
                </div>
                <p className="ml-6 whitespace-pre-wrap text-sm text-ink">
                  {m.body}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-border p-4">
          <div className="flex gap-3">
            <textarea
              value={composerText}
              onChange={(e) => setComposerText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type a message to continue this session…"
              className="workspace-input min-h-[60px] flex-1 resize-none font-mono text-sm"
              rows={2}
              disabled={sending}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || !composerText.trim()}
              className="btn-primary flex h-10 w-10 items-center justify-center rounded-lg disabled:opacity-60"
              aria-label="Send message"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </section>

      {prompts.length > 0 && (
        <section>
          <h2 className="section-label mb-3">Linked prompts</h2>
          <div className="space-y-2">
            {prompts.map((p) => (
              <div
                key={p.id}
                className="card flex items-start justify-between p-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink">{p.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted">
                    {p.content}
                  </p>
                </div>
                <div className="ml-4 flex shrink-0 items-center gap-2">
                  <Link
                    href={`/prompts/${p.id}`}
                    className="btn-secondary rounded-lg px-3 py-1.5 text-xs"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleRunPrompt(p.id, p.content)}
                    disabled={sending}
                    className="btn-primary flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-60"
                  >
                    {sending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Play className="h-3.5 w-3.5" />
                    )}
                    Run
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
