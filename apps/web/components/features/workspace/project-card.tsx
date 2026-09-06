"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, Refresh, MoreHorizontal, Pencil, Loader2 } from "@/components/ui/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { Modal } from "@/components/ui/modal";
import { Field, Input } from "@/components/ui/input";
import { ApiClientError } from "@/lib/api/client";
import { timeAgo } from "@/lib/data/providers";
import { workspaceService } from "@/lib/services/workspace";
import type { Project } from "@/lib/types";

export function ProjectCard({ project }: { project: Project }) {
  const router = useRouter();
  const [renameOpen, setRenameOpen] = useState(false);
  const [name, setName] = useState(project.name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function rename(e: React.FormEvent) {
    e.preventDefault();
    const next = name.trim();
    if (!next || next === project.name || busy) return;
    setBusy(true);
    setError(null);
    try {
      await workspaceService.updateProject(project.id, { name: next });
      setRenameOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not rename project.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleArchive() {
    if (busy) return;
    setBusy(true);
    try {
      await workspaceService.updateProject(project.id, {
        status: project.stage === "active" ? "archived" : "active",
      });
      router.refresh();
    } catch {
      setError("Could not update project.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Link
        href={`/workspace/${project.id}`}
        className="group flex h-full flex-col rounded-2xl border border-border bg-surface/40 p-5 transition-colors duration-150 hover:border-border-strong hover:bg-surface-2/50"
      >
        <div className="flex items-start justify-between gap-3">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-xl text-[15px] font-bold"
            style={{ background: `${project.color}22`, color: project.color }}
          >
            {project.name.charAt(0)}
          </span>
          <div
            className="flex items-center gap-1.5"
            role="presentation"
          >
            <Badge
              tone={project.stage === "active" ? "mint" : project.stage === "paused" ? "amber" : "neutral"}
            >
              {project.stage}
            </Badge>
            <DropdownMenu
              trigger={(open) => (
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-faint transition-colors hover:bg-surface-2 hover:text-ink">
                  <MoreHorizontal className="h-4 w-4" />
                </span>
              )}
              items={[
                {
                  id: "rename",
                  label: "Rename",
                  icon: <Pencil className="h-3.5 w-3.5" />,
                  onSelect: () => {
                    setName(project.name);
                    setRenameOpen(true);
                  },
                },
                {
                  id: "archive",
                  label: project.stage === "active" ? "Archive" : "Restore",
                  icon: project.stage === "active" ? (
                    <Archive className="h-3.5 w-3.5" />
                  ) : (
                    <Refresh className="h-3.5 w-3.5" />
                  ),
                  onSelect: toggleArchive,
                },
              ]}
            />
          </div>
        </div>
        <h3 className="mt-4 text-sm font-semibold text-ink transition-colors duration-150 group-hover:text-brand">
          {project.name}
        </h3>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">{project.description}</p>
        <div className="mt-4 flex items-center gap-3 border-t border-border pt-3 text-[11px] text-faint">
          <span>{project.promptCount} prompts</span>
          <span className="ml-auto">updated {timeAgo(project.updatedAt)}</span>
        </div>
      </Link>

      <Modal
        open={renameOpen}
        onClose={() => setRenameOpen(false)}
        title="Rename project"
        description={`"${project.name}"`}
      >
        <form onSubmit={rename} className="space-y-4">
          <Field label="Name">
            <Input
              id={`rename-${project.id}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
            />
          </Field>
          {error ? <p className="text-xs font-medium text-danger">{error}</p> : null}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => setRenameOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={busy || !name.trim()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
