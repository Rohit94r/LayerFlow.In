"use client";

import { useState, type FormEvent } from "react";
import { Loader2 } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { ApiClientError } from "@/lib/api/client";
import type { Domain } from "@/lib/api/types";
import { workspaceService } from "@/lib/services/workspace";

export function ProjectFormModal({
  open,
  onClose,
  domains,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  domains: Domain[];
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [domainId, setDomainId] = useState(domains[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await workspaceService.createProject({ name: name.trim(), description: description.trim() || undefined, domainId });
      setName("");
      setDescription("");
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not create project. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New project"
      description="Projects group the passports, prompts and learnings of one piece of work."
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Name" hint="e.g. Landing page copy">
          <Input
            id="project-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Project name"
            autoFocus
            required
          />
        </Field>
        <Field label="Domain">
          <Select id="project-domain" value={domainId} onChange={(e) => setDomainId(e.target.value)}>
            {domains.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Description (optional)">
          <Textarea
            id="project-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this project about?"
            rows={3}
          />
        </Field>
        {error ? <p className="text-xs font-medium text-danger">{error}</p> : null}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={busy || !name.trim()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Create project
          </Button>
        </div>
      </form>
    </Modal>
  );
}
