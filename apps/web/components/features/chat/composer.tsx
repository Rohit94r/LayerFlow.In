"use client";

import { useRef } from "react";
import { ArrowUp, ChevronDown, Loader2, Save, Sparkles, Zap } from "@/components/ui/icons";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { PICKER_MODELS } from "./chat-models";

export function Composer({
  value,
  onChange,
  onSend,
  onOpenModel,
  onImprove,
  onSaveMemory,
  currentModel,
  disabled,
  improveBusy,
  saveBusy,
  autoSwitch,
  onToggleAutoSwitch,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onOpenModel: () => void;
  onImprove: () => void;
  onSaveMemory: () => void;
  currentModel: string | null;
  disabled?: boolean;
  improveBusy?: boolean;
  saveBusy?: boolean;
  autoSwitch: boolean;
  onToggleAutoSwitch: (v: boolean) => void;
}) {
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const current = PICKER_MODELS.find((m) => m.id === (currentModel ?? "auto"));
  const canSend = value.trim().length > 0 && !disabled;
  const canImprove = value.trim().length >= 10 && !disabled && !improveBusy;

  const submit = () => {
    if (!canSend) return;
    onSend();
  };

  return (
    <div className="rounded-2xl border border-border bg-surface p-2.5 transition-colors focus-within:border-border-strong">
      <textarea
        ref={areaRef}
        rows={1}
        value={value}
        disabled={disabled}
        onChange={(e) => {
          onChange(e.target.value);
          const el = areaRef.current;
          if (el) {
            el.style.height = "auto";
            el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
          if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "i") {
            e.preventDefault();
            if (canImprove) onImprove();
          }
        }}
        placeholder="Ask anything…"
        className="max-h-[200px] w-full resize-none bg-transparent px-2 py-2 text-sm leading-relaxed text-ink placeholder:text-faint focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
      />

      <div className="mt-1 flex items-center gap-1.5">
        <button
          type="button"
          onClick={onOpenModel}
          className="inline-flex h-7 items-center gap-1 rounded-lg px-2 text-[11px] font-medium text-muted transition-colors hover:bg-surface-2 hover:text-ink"
        >
          {current?.label ?? "Auto"}
          <ChevronDown className="h-3 w-3 text-faint" />
        </button>

        <span
          className="inline-flex h-7 cursor-default items-center gap-1.5 rounded-lg px-2 text-[10.5px] font-medium text-faint"
          title="When a key runs out, switch to the next working model automatically"
        >
          <Zap className="h-3 w-3" />
          Auto-switch
          <Switch checked={autoSwitch} onCheckedChange={onToggleAutoSwitch} className="scale-75" />
        </span>

        <span className="flex-1" />

        <button
          type="button"
          onClick={onSaveMemory}
          disabled={disabled || saveBusy}
          aria-label="Save to memory"
          title="Save this reply as a permanent memory"
          className={cn(
            "inline-flex h-7 items-center gap-1 rounded-lg px-2 text-[11px] font-medium transition-colors",
            disabled
              ? "cursor-not-allowed text-faint"
              : "text-muted hover:bg-surface-2 hover:text-brand-2",
          )}
        >
          {saveBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save
        </button>

        <button
          type="button"
          onClick={onImprove}
          disabled={!canImprove}
          title="Improve this prompt with AI (⌘I)"
          className={cn(
            "inline-flex h-7 items-center gap-1 rounded-lg px-2 text-[11px] font-medium transition-colors",
            canImprove
              ? "text-brand hover:bg-brand/10"
              : "cursor-not-allowed text-faint",
          )}
        >
          {improveBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          Improve
        </button>

        <button
          type="button"
          onClick={submit}
          disabled={!canSend}
          aria-label="Send"
          className={cn(
            "inline-flex h-8 w-8 items-center justify-center rounded-xl transition-all",
            canSend
              ? "bg-ink text-bg hover:opacity-85"
              : "bg-surface-2 text-faint",
          )}
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
