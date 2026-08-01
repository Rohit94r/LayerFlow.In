"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, BookUser, Search } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { PassportCard } from "@/components/app/passport-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PASSPORTS, RESCUE_REPORTS } from "@/lib/data/passports";
import { PROJECT_BY_ID } from "@/lib/data/workspace";

const FILTERS = ["All", ...PROJECT_BY_ID ? [...new Set(PASSPORTS.map((p) => p.meta.projectId).filter(Boolean))].map((id) => PROJECT_BY_ID[id!].name) : []];

export default function PassportsClient() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");

  const rescued = PASSPORTS.map((p) => {
    const report = RESCUE_REPORTS.find((r) => r.title.includes(p.title.split("—")[0].trim()));
    return { ...p, report };
  });

  const filtered = rescued.filter((p) => {
    const inProject =
      filter === "All" ||
      (p.meta.projectId && PROJECT_BY_ID[p.meta.projectId]?.name === filter);
    const haystack = `${p.title} ${p.fields.goal} ${p.fields.decisions.join(" ")} ${p.meta.tags.join(" ")}`.toLowerCase();
    return inProject && (!query || haystack.includes(query.toLowerCase()));
  });

  return (
    <div>
      <PageHeader
        title="Context Passports"
        description="Your portable memory packages — rescue one from a chat or build from scratch."
        actions={
          <Link href="/rescue">
            <Button icon={<Plus className="h-4 w-4" />}>New rescue</Button>
          </Link>
        }
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <Input
            type="search"
            placeholder="Search passports…"
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`filter-pill ${filter === f ? "filter-pill-active" : ""}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card flex flex-col items-center px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-surface-2 text-faint">
            <BookUser className="h-6 w-6" />
          </span>
          <h3 className="mt-5 text-base font-semibold text-ink">No passports match</h3>
          <p className="mt-1.5 max-w-sm text-sm text-muted">
            Try a different search, or rescue a chat and save it as a passport.
          </p>
          <Link href="/rescue" className="mt-5">
            <Button variant="secondary" size="sm">Rescue a chat</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => (
            <PassportCard key={p.id} passport={p} />
          ))}
        </div>
      )}

      <p className="mt-8 text-center text-[11px] text-faint">
        {filtered.length} passport{filtered.length === 1 ? "" : "s"} ·{" "}
        {PASSPORTS.filter((p) => p.favorite).length} favorites · storage encrypted
      </p>
    </div>
  );
}
