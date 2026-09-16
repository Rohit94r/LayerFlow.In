"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import type { ChatEvent } from "@layerflow/contracts";
import { Loader2, Plus, Sparkles } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { chatService, streamChatMessage } from "@/lib/services/chat";
import { PROVIDER_LABELS, formatMoney } from "@/lib/data/providers";
import { cn } from "@/lib/utils";

const DEFAULT_MODEL = "grok-3-mini";

interface TerminalEntry {
  id: string;
  kind: "prompt" | "stream" | "done" | "error";
  text: string;
  model?: string;
  provider?: string;
  keyHint?: string | null;
  cost?: number;
  switched?: { fromModel: string; toModel: string; reason: string } | null;
  code?: string;
}

function nameModel(model: string): string {
  const slash = model.lastIndexOf("/");
  return slash >= 0 ? model.slice(slash + 1) : model;
}

/** Short reason text for a mid-stream provider switch. */
function switchReason(reason: string): string {
  if (/key/i.test(reason)) return reason;
  return `key failed: ${reason}`;
}

export function TerminalRepl() {
  const [entries, setEntries] = useState<TerminalEntry[]>([]);
  const [prompt, setPrompt] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [socketOpen, setSocketOpen] = useState(false);
  const [lastPrompt, setLastPrompt] = useState<string | null>(null);

  const sessionRef = useRef<string | null>(null);
  const contentRef = useRef("");
  const placeholderRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const streaming = socketOpen;

  function replaceEntry(id: string, patch: Partial<TerminalEntry>) {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }

  function appendEntry(entry: TerminalEntry) {
    setEntries((prev) => [...prev, entry]);
  }

  function scrollToBottom() {
    window.setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 0);
  }

  async function ensureSession(): Promise<string | null> {
    if (sessionRef.current) return sessionRef.current;
    try {
      const created = await chatService.create({
        title: "AI Terminal",
        defaultModel: DEFAULT_MODEL,
        autoSwitch: true,
      });
      sessionRef.current = created.session.id;
      setSessionId(created.session.id);
      return created.session.id;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      appendEntry({
        id: `err-${Date.now()}`,
        kind: "error",
        text: /fetch|network|ECONNREFUSED|Failed to fetch/i.test(msg)
          ? "Cannot reach the API server. Make sure the backend is running."
          : msg || "Could not start a chat session.",
      });
      return null;
    }
  }

  async function send(input?: string) {
    const text = (input ?? prompt).trim();
    if (!text || streaming) return;

    setLastPrompt(text);
    setPrompt("");
    contentRef.current = "";
    appendEntry({ id: `p-${Date.now()}`, kind: "prompt", text });
    const placeholderId = `s-${Date.now()}`;
    placeholderRef.current = placeholderId;
    appendEntry({ id: placeholderId, kind: "stream", text: "" });
    scrollToBottom();

    const id = await ensureSession();
    if (!id) {
      replaceEntry(placeholderId, {
        kind: "error",
        text: "Could not start a session — add a provider key or check the backend, then try again.",
        code: "no_session",
      });
      return;
    }

    setSocketOpen(true);
    const controller = new AbortController();
    abortRef.current = controller;

    let switched: TerminalEntry["switched"] = null;

    const onEvent = (event: ChatEvent) => {
      switch (event.type) {
        case "start":
          replaceEntry(placeholderId, {
            model: event.model,
            provider: event.provider,
            keyHint: event.keyHint,
          });
          break;
        case "delta":
          contentRef.current += event.text;
          replaceEntry(placeholderId, { text: contentRef.current });
          scrollToBottom();
          break;
        case "switched":
          switched = {
            fromModel: event.fromModel,
            toModel: event.toModel,
            reason: switchReason(event.reason),
          };
          break;
        case "done":
          replaceEntry(placeholderId, {
            kind: "done",
            text: event.message.content,
            model: event.message.model ?? undefined,
            provider: event.message.provider ?? undefined,
            keyHint: event.message.keyHint,
            cost: event.message.cost,
            switched: switched ?? event.message.switchedFrom ?? null,
          });
          break;
        case "error":
          replaceEntry(placeholderId, {
            kind: "error",
            text: event.message,
            code: event.code,
            switched,
          });
          break;
      }
    };

    try {
      await streamChatMessage({
        sessionId: id,
        content: text,
        autoSwitch: true,
        signal: controller.signal,
        onEvent,
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      const msg = err instanceof Error ? err.message : "";
      const hasPartial = contentRef.current.length > 0;
      replaceEntry(placeholderId, hasPartial ? { text: contentRef.current } : {
        kind: "error",
        text: /fetch|network|ECONNREFUSED|Failed to fetch/i.test(msg)
          ? "Cannot reach the API server. Make sure the backend is running."
          : msg || "Could not reach the chat server.",
        code: "network",
      });
    } finally {
      setSocketOpen(false);
      scrollToBottom();
    }
  }

  function retry() {
    if (!lastPrompt || streaming) return;
    void send(lastPrompt);
  }

  function reset() {
    abortRef.current?.abort();
    abortRef.current = null;
    contentRef.current = "";
    placeholderRef.current = null;
    setLastPrompt(null);
    sessionRef.current = null;
    setSessionId(null);
    setEntries([]);
    setSocketOpen(false);
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border p-5 md:p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-brand">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-ink">AI Terminal</h2>
            <p className="text-xs text-muted">
              Type a prompt — answered by Grok 3 mini by default, auto-fallback to any other provider that works.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={reset} icon={<Plus className="h-3.5 w-3.5" />} disabled={entries.length === 0}>
          New session
        </Button>
      </div>

      <div className="bg-bg/70 px-4 py-3 md:px-6">
        <div
          className={cn(
            "space-y-2.5 rounded-xl border border-border bg-surface-2/70 p-4 font-mono text-[12.5px] leading-relaxed",
            entries.length === 0 && "min-h-[10rem]",
          )}
          role="log"
          aria-live="polite"
        >
          {entries.length === 0 ? (
            <p className="text-faint">
              <span className="text-brand">$</span> _ <span className="ml-1 text-muted">— say hello, or try:</span>
              <br />
              <span className="text-brand">$</span> what can LayerFlow do for my team?
            </p>
          ) : (
            entries.map((e) => {
              if (e.kind === "prompt") {
                return (
                  <div key={e.id} className="text-ink">
                    <span className="text-brand font-semibold">$</span> {e.text}
                  </div>
                );
              }
              if (e.kind === "error") {
                return (
                  <div key={e.id}>
                    <span className="text-crimson font-semibold">✕</span>{" "}
                    <span className="text-crimson/90">{e.text}</span>
                    {e.code === "no_provider" || e.code === "provider_key_missing" ? (
                      <span className="block text-faint">
                        → Add a private own key under{" "}
                        <a className="text-brand underline underline-offset-2" href="/keys">
                          Settings → API Keys
                        </a>
                        .
                      </span>
                    ) : null}
                    <button
                      type="button"
                      onClick={retry}
                      disabled={!lastPrompt || streaming}
                      className="ml-2 inline-flex items-center gap-1 rounded-md border border-border px-1.5 py-0.5 text-[11px] text-muted transition-colors hover:border-brand/40 hover:text-brand disabled:pointer-events-none disabled:opacity-40"
                    >
                      retry ↵
                    </button>
                  </div>
                );
              }
              return (
                <div key={e.id} className="text-ink/90">
                  {e.model ? (
                    <span className="mr-1.5 text-faint">
                      [{nameModel(e.model)}
                      {e.provider ? (
                        <>
                          {" · "}
                          {PROVIDER_LABELS[e.provider] ?? e.provider}
                        </>
                      ) : null}
                      ]
                    </span>
                  ) : null}
                  {e.switched ? (
                    <span className="mr-1.5 text-amber-400">
                      [switched {nameModel(e.switched.fromModel)} → {nameModel(e.switched.toModel)}:{" "}
                      {e.switched.reason}]
                    </span>
                  ) : null}
                  {e.kind === "stream" && streaming ? (
                    <>
                      <span className="animate-pulse text-brand">▍</span>
                    </>
                  ) : null}
                  <span className="whitespace-pre-wrap">{e.text}</span>
                  {e.kind === "done" && e.cost ? (
                    <span className="ml-1.5 text-faint">({formatMoney(e.cost)})</span>
                  ) : null}
                </div>
              );
            })
          )}
          <div ref={bottomRef} className="h-px" aria-hidden="true" />
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2">
          <span className="font-mono text-sm font-semibold text-brand">$</span>
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void send();
            }}
            placeholder="Type a prompt and press Enter…"
            className="min-w-0 flex-1 bg-transparent font-mono text-[13px] text-ink placeholder:text-faint focus:outline-none"
            autoComplete="off"
            aria-label="Terminal prompt"
          />
          {streaming ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-brand" />
          ) : (
            <span className="shrink-0 hidden text-[11px] text-faint sm:inline">
              {sessionId ? `session ${sessionId.slice(0, 8)}` : "auto"}
            </span>
          )}
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-faint">
          Runs through the same chat router as the Chat workspace — if Grok is missing a key or rate-limits, the
          request automatically falls back to the next available provider. Responses and cost appear in{" "}
          <Link className="text-brand hover:underline" href="/chat">
            Chat
          </Link>
          .
        </p>
      </div>
    </section>
  );
}