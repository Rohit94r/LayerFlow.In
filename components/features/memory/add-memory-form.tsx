"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Brain, Check, Loader2, Plus } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Field, Input, Textarea } from "@/components/ui/input";
import { memoryService } from "@/lib/services/memory";

export function AddMemoryForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!title.trim() || !body.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      await memoryService.create({ title: title.trim(), body: body.trim(), sourceType: "manual" });
      setTitle("");
      setBody("");
      setSaved(true);
      router.refresh();
      window.setTimeout(() => setSaved(false), 1800);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save memory");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel>
      <PanelHeader title="Add a memory" description="Long-term context for every future prompt" action={<Brain className="h-4 w-4 text-faint" />} />
      <PanelBody className="space-y-4">
        <Field label="Title">
          <Input
            placeholder="e.g. Deploys use Fly.io; DB is managed Postgres"
            value={title}
            maxLength={200}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>
        <Field label="Details" hint="Retrieved automatically when relevant to a new prompt.">
          <Textarea
            placeholder="What should LayerFlow remember?"
            value={body}
            maxLength={20_000}
            onChange={(e) => setBody(e.target.value)}
          />
        </Field>
        {error ? <p className="text-xs text-red-400">{error}</p> : null}
        <Button
          size="sm"
          onClick={() => void submit()}
          disabled={saving || !title.trim() || !body.trim()}
          icon={
            saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : saved ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )
          }
        >
          {saving ? "Saving…" : saved ? "Saved" : "Save memory"}
        </Button>
      </PanelBody>
    </Panel>
  );
}
