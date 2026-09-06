"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Search } from "@/components/ui/icons";

export function QuickSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState(false);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q || pending) return;
    setPending(true);
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-xl">
      <label htmlFor="quick-search" className="sr-only">
        Search prompts and conversations
      </label>
      <div className="group relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-faint transition-colors group-focus-within:text-brand" />
        <input
          id="quick-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search prompts and conversations…"
          required
          disabled={pending}
          aria-label="Search prompts and conversations"
          className="h-12 w-full rounded-2xl border border-border bg-surface/60 pl-11 pr-4 text-sm text-ink placeholder:text-faint outline-none transition-colors focus:border-brand focus:bg-surface disabled:opacity-50"
        />
      </div>
    </form>
  );
}