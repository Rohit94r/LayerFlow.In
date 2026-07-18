"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus } from "lucide-react";
import PageHeader from "@/components/workspace/PageHeader";
import SessionList from "@/components/workspace/SessionList";
import { ErrorState, LoadingState } from "@/components/workspace/DataState";
import { useAsyncData, errorMessage } from "@/lib/hooks/use-async-data";
import { listSessions, listDomains, createSession } from "@/lib/api";
import { mapDomain, mapSession } from "@/lib/api/mappers";

async function loadSessions() {
  const [sessionsRes, domainsRes] = await Promise.all([listSessions(), listDomains()]);
  return {
    sessions: sessionsRes.sessions.map((s) => mapSession(s)),
    domains: domainsRes.domains.map((d) => mapDomain(d)),
  };
}

export default function SessionsClient() {
  const router = useRouter();
  const state = useAsyncData(loadSessions, []);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (state.status === "loading") return <LoadingState label="Loading sessions…" />;
  if (state.status === "error") {
    return <ErrorState message={errorMessage(state.error)} onRetry={state.reload} />;
  }

  const handleCreate = async () => {
    setCreating(true);
    setError(null);
    try {
      const domain = state.data.domains[0];
      const res = await createSession({
        title: "New session",
        description: "Multi-step prompt workflow",
        domainId: domain?.id,
      });
      router.push(`/sessions/${res.session.id}`);
    } catch (err) {
      setError(errorMessage(err));
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace"
        title="Sessions"
        description="Chain prompts into conversation groups — like ChatGPT threads."
        actions={
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating}
            className="btn-primary flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            {creating ? "Creating…" : "New session"}
          </button>
        }
      />
      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">
          {error}
        </p>
      )}
      <SessionList sessions={state.data.sessions} domains={state.data.domains} />
    </div>
  );
}
