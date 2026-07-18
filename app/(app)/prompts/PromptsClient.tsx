"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import PageHeader from "@/components/workspace/PageHeader";
import PromptList from "@/components/workspace/PromptList";
import FilterPills from "@/components/workspace/FilterPills";
import { ErrorState, LoadingState } from "@/components/workspace/DataState";
import { useAsyncData, errorMessage } from "@/lib/hooks/use-async-data";
import { listDomains, listProjects, listPrompts, createPrompt, search } from "@/lib/api";
import { mapDomain, mapProject, mapPrompt } from "@/lib/api/mappers";

async function loadPromptsPage() {
  const [domainsRes, projectsRes, promptsRes] = await Promise.all([
    listDomains(),
    listProjects(),
    listPrompts({ limit: 100 }),
  ]);
  return {
    domains: domainsRes.domains.map((d) => mapDomain(d)),
    projects: projectsRes.projects.map((p) => mapProject(p)),
    prompts: promptsRes.prompts.map((p) => mapPrompt(p)),
  };
}

export default function PromptsClient() {
  const router = useRouter();
  const state = useAsyncData(loadPromptsPage, []);
  const [query, setQuery] = useState("");
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [searchResults, setSearchResults] = useState<string[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!state.data) return [];
    let list = state.data.prompts;
    if (favoriteOnly) list = list.filter((p) => p.favorite);
    if (searchResults) {
      const ids = new Set(searchResults);
      list = list.filter((p) => ids.has(p.id));
    } else if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.content.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [state.data, favoriteOnly, query, searchResults]);

  const runSearch = async () => {
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    setError(null);
    try {
      const res = await search({ q: query.trim(), type: "prompt" });
      setSearchResults(
        res.results.filter((r) => r.type === "prompt").map((r) => r.id),
      );
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSearching(false);
    }
  };

  const handleCreate = async () => {
    if (!state.data) return;
    setCreating(true);
    setError(null);
    try {
      const coding =
        state.data.domains.find((d) => d.slug === "coding") ?? state.data.domains[0];
      const project =
        state.data.projects.find((p) => p.domainId === coding?.id) ??
        state.data.projects[0];
      const res = await createPrompt({
        title: "Untitled prompt",
        body: "Write your prompt here…",
        domainId: coding?.id,
        projectId: project?.id,
      });
      router.push(`/prompts/${res.prompt.id}`);
    } catch (err) {
      setError(errorMessage(err));
      setCreating(false);
    }
  };

  if (state.status === "loading") return <LoadingState label="Loading prompts…" />;
  if (state.status === "error") {
    return <ErrorState message={errorMessage(state.error)} onRetry={state.reload} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace"
        title="Prompts"
        description="Search, filter, and open any saved prompt."
        actions={
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating}
            className="btn-primary flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            {creating ? "Creating…" : "New prompt"}
          </button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSearchResults(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") void runSearch();
            }}
            placeholder="Search prompts…"
            className="workspace-input pl-9"
          />
        </div>
        <button
          type="button"
          onClick={runSearch}
          disabled={searching}
          className="btn-secondary rounded-lg px-4 py-2 text-sm"
        >
          {searching ? "Searching…" : "Search"}
        </button>
      </div>

      <FilterPills
        items={[
          {
            label: "All",
            href: "#",
            active: !favoriteOnly,
            onClick: () => setFavoriteOnly(false),
          },
          {
            label: "Favorites",
            href: "#",
            active: favoriteOnly,
            onClick: () => setFavoriteOnly(true),
          },
        ]}
      />

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">
          {error}
        </p>
      )}

      <PromptList
        prompts={filtered}
        showProject
        domains={state.data.domains}
        projects={state.data.projects}
      />
    </div>
  );
}
