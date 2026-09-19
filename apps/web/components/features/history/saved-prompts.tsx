"use client";

import { useState } from "react";
import { Copy, Loader2, Plus, Save, Sparkles, Trash2 } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Textarea, Field } from "@/components/ui/input";
import { promptService } from "@/lib/services/prompts";
import { useCopy } from "@/lib/hooks";
import { timeAgo } from "@/lib/data/providers";
import type { Prompt } from "@/lib/types";

type Message = { type: "success" | "error"; text: string } | null;

/** Saved prompts live inside History — list, save a prompt, copy or delete. */
export function SavedPromptsPanel({ initial }: { initial: Prompt[] }) {
  const [prompts, setPrompts] = useState<Prompt[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { copied, copy } = useCopy();

  // Save form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [body, setBody] = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      setMessage({ type: "error", text: "Title and prompt body are required." });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const created = await promptService.create({
        title: title.trim(),
        description: description.trim() || undefined,
        body: body,
        tags: tags
          .split(",")
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean)
          .slice(0, 20),
      });
      setPrompts((p) => [created, ...p.filter((x) => x.id !== created.id)]);
      setTitle("");
      setDescription("");
      setTags("");
      setBody("");
      setShowForm(false);
      setMessage({ type: "success", text: "Prompt saved — it now lives in History and your search index." });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Could not save the prompt right now." });
    } finally {
      setSaving(false);
    }
  }

  async function handleCopy(p: Prompt) {
    setBusyId(p.id);
    try {
      const full = await promptService.getPrompt(p.id);
      await copy(full?.content || "");
      setMessage({ type: "success", text: "Prompt copied to clipboard." });
    } catch {
      setMessage({ type: "error", text: "Could not load the prompt body to copy." });
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string) {
    setBusyId(id);
    try {
      await promptService.remove(id);
      setPrompts((p) => p.filter((x) => x.id !== id));
      setMessage({ type: "success", text: "Prompt deleted." });
    } catch {
      setMessage({ type: "error", text: "Could not delete the prompt." });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      {message ? (
        <div
          className={`rounded-xl border px-4 py-3 text-sm font-medium ${
            message.type === "success"
              ? "border-mint/30 bg-mint/10 text-mint"
              : "border-rose/30 bg-rose/10 text-rose"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted">
          Your personal prompt library — store a reusable prompt once and reuse it in chat.
        </p>
        <Button size="sm" variant={showForm ? "ghost" : "primary"} icon={<Plus className="h-4 w-4" />} onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Cancel" : "Save a prompt"}
        </Button>
      </div>

      {showForm ? (
        <form onSubmit={handleSave} className="grid gap-4 rounded-xl border border-border bg-surface-2/40 p-4 md:grid-cols-2">
          <Field label="Title">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Client proposal skeleton" autoFocus />
          </Field>
          <Field label="Tags">
            <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="comma, separated, tags" />
          </Field>
          <div className="md:col-span-2">
            <Field label="Prompt body">
              <Textarea
                rows={5}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write the reusable prompt text…"
              />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label="Description" hint="Optional — one line about what this prompt is for.">
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this prompt helps you do" />
            </Field>
          </div>
          <div className="flex justify-end pt-1 md:col-span-2">
            <Button type="submit" loading={saving} icon={<Save className="h-4 w-4" />}>
              Save prompt
            </Button>
          </div>
        </form>
      ) : null}

      {prompts.length ? (
        <ul className="space-y-3">
          {prompts.map((p) => (
            <li key={p.id} className="rounded-xl border border-border bg-surface-2/40 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 truncate text-sm font-semibold text-ink">
                    <Sparkles className="h-3.5 w-3.5 shrink-0 text-brand" />
                    {p.title}
                  </p>
                  {p.description ? <p className="mt-0.5 line-clamp-1 text-[11.5px] text-muted">{p.description}</p> : null}
                  <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[10.5px] text-faint">
                    {p.tags.slice(0, 4).map((t) => (
                      <Badge key={t} tone="neutral">
                        #{t}
                      </Badge>
                    ))}
                    {p.tags.length === 0 ? <span>{p.source === "improve" ? "Improved prompt" : "Saved prompt"}</span> : null}
                    <span>·</span>
                    <span>{timeAgo(p.updatedAt)}</span>
                    <span>·</span>
                    <span>{p.usageCount} uses</span>
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Button size="sm" variant="ghost" icon={busyId === p.id && copied ? <Copy className="h-3.5 w-3.5 text-mint" /> : <Copy className="h-3.5 w-3.5" />} onClick={() => handleCopy(p)}>
                    {copied && busyId === p.id ? "Copied" : "Copy"}
                  </Button>
                  <Button size="sm" variant="ghost" icon={busyId === p.id && !copied ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} onClick={() => handleDelete(p.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-faint">
          No prompts saved yet — hit “Save a prompt” to store your first reusable prompt.
        </div>
      )}
    </div>
  );
}