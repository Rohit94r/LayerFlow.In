"use client";

import { useState } from "react";
import { ClipboardPaste, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/input";
import { ToolChip } from "@/components/ui/tool-logo";
import { SAMPLE_CONVERSATIONS } from "@/lib/data/conversations";
import type { AiTool } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PasteView({
  mode,
  onAnalyze,
}: {
  mode: "rescue" | "prompt";
  onAnalyze: (payload: { text: string; source: AiTool; target: AiTool }) => void;
}) {
  const [text, setText] = useState("");
  const [source, setSource] = useState<AiTool>("chatgpt");
  const [target, setTarget] = useState<AiTool>("gemini");
  const [busy, setBusy] = useState(false);

  const isPrompt = mode === "prompt";
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  function run() {
    if (!text.trim() || busy) return;
    setBusy(true);
    window.setTimeout(() => {
      setBusy(false);
      onAnalyze({ text, source, target });
    }, 350);
  }

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Field
          label={isPrompt ? "Your prompt to improve" : "Paste the conversation you lost"}
          hint={
            isPrompt
              ? "LayerFlow adds context, constraints, examples, format and clarity — then scores it."
              : "Paste everything you can copy, even a partial thread. Works with ChatGPT, Claude, Gemini, DeepSeek, Kimi and more."
          }
        >
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              isPrompt
                ? "Paste a prompt that didn't give you the answer you wanted…"
                : "Paste your AI conversation here…\n\nTip: select all → copy from your AI tool, then paste."
            }
            className="min-h-72 resize-y font-mono text-[13px] leading-relaxed"
          />
        </Field>

        <div className="mt-3 flex items-center justify-between">
          <span className="text-[11px] text-faint">
            {words > 0 ? `${words.toLocaleString()} words` : "0 words"} · stays private
          </span>
          <div className="flex gap-2.5">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setText(SAMPLE_CONVERSATIONS[0].messages.map((m) => m.content).join("\n\n"))}
            >
              Load sample chat
            </Button>
            <Button
              size="sm"
              onClick={run}
              disabled={!text.trim()}
              loading={busy}
              icon={isPrompt ? <Wand2 className="h-3.5 w-3.5" /> : <ClipboardPaste className="h-3.5 w-3.5" />}
            >
              {busy ? "Preparing…" : isPrompt ? "Improve Prompt" : "Rescue My Chat"}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Source / target ── */}
      <div className="space-y-5">
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-faint">
            {isPrompt ? "Model to improve for" : "Detected source"}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(["chatgpt", "claude", "gemini", "deepseek", "kimi", "groq"] as AiTool[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setSource(t)}
                className={cn(
                  "rounded-full border px-3 py-1.5 transition-all",
                  source === t
                    ? "border-brand/50 bg-brand/10"
                    : "border-border bg-surface-2/40 hover:border-border-strong",
                )}
              >
                <ToolChip tool={t} className="border-0 bg-transparent p-0" />
              </button>
            ))}
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-faint">
            Detected automatically from your paste. Tap to override.
          </p>
        </div>

        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-faint">Continue in</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(["claude", "gemini", "deepseek", "kimi", "groq", "chatgpt"] as AiTool[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTarget(t)}
                className={cn(
                  "rounded-full border px-3 py-1.5 transition-all",
                  target === t
                    ? "border-brand/50 bg-brand/10"
                    : "border-border bg-surface-2/40 hover:border-border-strong",
                )}
              >
                <ToolChip tool={t} className="border-0 bg-transparent p-0" />
              </button>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-faint">What you get</p>
          <ul className="mt-3 space-y-2 text-[13px] text-muted">
            <li>· Context Passport — decisions, constraints, next action</li>
            <li>· Smart Compress — useful context only, with counts</li>
            <li>· Context Diff — what was kept and removed</li>
            <li>· Improved next prompt, scored 0–100</li>
            <li>· Cost Check across 6+ providers</li>
            <li>· Best model + why</li>
            <li>· Continue Pack — copy & paste anywhere</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
