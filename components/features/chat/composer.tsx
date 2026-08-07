"use client";

import { useRef } from "react";
import { ArrowUp, ChevronDown, Zap } from "@/components/ui/icons";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { PICKER_MODELS } from "./chat-models";

export function Composer({
  value,
  onChange,
  onSend,
  onOpenModel,
  currentModel,
  disabled,
  autoSwitch,
  onToggleAutoSwitch,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onOpenModel: () => void;
  currentModel: string | null;
  disabled?: boolean;
  autoSwitch: boolean;
  onToggleAutoSwitch: (v: boolean) => void;
}) {
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const current = PICKER_MODELS.find((m) => m.id === (currentModel ?? "auto"));
  const canSend = value.trim().length > 0 && !disabled;

  const submit = () => {
    if (!canSend) return;
    onSend();
  };

  return (
    <div className="rounded-2xl border border-border bg-surface-2/40 p-3 focus-within:border-border-strong">
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
        }}
        placeholder="Ask anything — continue where you left off…"
        className="max-h-[200px] w-full resize-none bg-transparent px-1 py-1 text-sm text-ink placeholder:text-faint focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
      />

      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenModel}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-2.5 text-[11px] font-semibold text-muted transition-colors hover:border-border-strong hover:text-ink"
        >
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
          {current?.label ?? "Auto"}
          <ChevronDown className="h-3 w-3 text-faint" />
        </button>

        <button
          type="button"
          onClick={() => onToggleAutoSwitch(!autoSwitch)}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[10.5px] font-semibold transition-colors",
            autoSwitch ? "text-brand" : "text-faint",
          )}
          title="When a key runs out, switch to the next working model automatically"
        >
          <Zap className="h-3 w-3" />
          Auto-switch
          <Switch checked={autoSwitch} onCheckedChange={onToggleAutoSwitch} className="scale-75" />
        </button>

        <span className="flex-1" />

        <button
          type="button"
          onClick={submit}
          disabled={!canSend}
          aria-label="Send"
          className={cn(
            "inline-flex h-8 w-8 items-center justify-center rounded-lg transition-all",
            canSend
              ? "bg-gradient-to-br from-amber-400 to-emerald-400 text-[#0e1416] hover:opacity-90"
              : "bg-surface-2 text-faint",
          )}
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}