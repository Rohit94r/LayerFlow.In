"use client";

import { useState } from "react";
import { Plus, Trash2, Loader2, X } from "lucide-react";
import type { RoutingRule } from "@/lib/types";

interface RoutingRulesProps {
  rules: RoutingRule[];
  onToggle?: (id: string) => void;
  onAdd?: (condition: string, model: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export default function RoutingRules({ rules, onToggle, onAdd, onDelete }: RoutingRulesProps) {
  const [showForm, setShowForm] = useState(false);
  const [condition, setCondition] = useState("");
  const [model, setModel] = useState("gpt-4o");
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!condition.trim() || !onAdd) return;
    setBusy(true);
    try {
      await onAdd(condition.trim(), model);
      setCondition("");
      setShowForm(false);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!onDelete) return;
    setDeleting(id);
    try {
      await onDelete(id);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-2">
      {rules.length === 0 && !showForm && (
        <p className="text-sm text-muted">
          No routing rules yet. Add one to auto-route prompts by condition.
        </p>
      )}
      {rules.map((rule) => (
        <div
          key={rule.id}
          className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-ink">{rule.condition}</p>
            <p className="font-mono text-xs text-faint">→ {rule.model}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onToggle?.(rule.id)}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                rule.enabled ? "bg-brand" : "bg-surface-2"
              }`}
              aria-label={`Toggle ${rule.condition}`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                  rule.enabled ? "left-[22px]" : "left-0.5"
                }`}
              />
            </button>
            <button
              type="button"
              onClick={() => handleDelete(rule.id)}
              disabled={deleting === rule.id}
              className="btn-secondary p-1 text-xs text-red-500 disabled:opacity-60"
              aria-label={`Delete ${rule.condition}`}
            >
              {deleting === rule.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>
      ))}

      {showForm && (
        <div className="rounded-lg border border-border bg-surface p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium text-muted">New routing rule</p>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-faint hover:text-ink"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              placeholder='e.g. "Coding tasks"'
              className="workspace-input flex-1 text-xs"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
              }}
            />
            <span className="text-xs text-faint">→</span>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="workspace-input w-36 text-xs"
            >
              <option value="gpt-4o">gpt-4o</option>
              <option value="gpt-4o-mini">gpt-4o-mini</option>
              <option value="claude-sonnet-4">claude-sonnet-4</option>
              <option value="gemini-2.5-flash">gemini-2.5-flash</option>
              <option value="deepseek-chat">deepseek-chat</option>
            </select>
            <button
              type="button"
              onClick={handleAdd}
              disabled={busy || !condition.trim()}
              className="btn-primary flex items-center gap-1 rounded px-3 py-1.5 text-xs font-medium disabled:opacity-60"
            >
              {busy ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Plus className="h-3 w-3" />
              )}
              Add
            </button>
          </div>
        </div>
      )}

      {!showForm && (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="btn-secondary w-full py-2 text-sm"
        >
          Add routing rule
        </button>
      )}
    </div>
  );
}
