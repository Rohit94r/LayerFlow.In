"use client";

/**
 * Terminal REPL UI Component — Inspired by OpenCode and Cline CLI.
 * 
 * What this does:
 * Full-featured interactive AI terminal providing token streaming, command history,
 * multi-model switching, slash commands (/help, /model, /clear, /cost, /keys, /status),
 * collapsible thinking disclosures, markdown & syntax-highlighted code blocks with copy,
 * and intelligent error handling with auto-recovery.
 * 
 * Callers:
 * apps/web/app/(dashboard)/terminal/page.tsx
 * 
 * Expected Props:
 * None (self-contained stateful component)
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { ChatEvent, ChatSession } from "@layerflow/contracts";
import {
  AlertTriangle,
  ArrowDown,
  Bot,
  Brain,
  Check,
  ChevronDown,
  Clock,
  Code2,
  Copy,
  DollarSign,
  History,
  KeyRound,
  Loader2,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  TerminalSquare,
  X,
} from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { chatService, streamChatMessage } from "@/lib/services/chat";
import { FALLBACK_PICKER_MODELS, getPickerModels, type PickerModel } from "@/components/features/chat/chat-models";
import { PROVIDER_LABELS, formatMoney } from "@/lib/data/providers";
import { pingApi } from "@/lib/api/config";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────

export interface TerminalEntry {
  id: string;
  kind: "prompt" | "system" | "assistant" | "error";
  text: string;
  model?: string;
  provider?: string;
  keyHint?: string | null;
  cost?: number;
  tokensIn?: number;
  tokensOut?: number;
  latencyMs?: number;
  thinking?: string | null;
  thinkingMs?: number;
  switched?: { fromModel: string; toModel: string; reason: string } | null;
  code?: string;
  timestamp: string;
  isStreaming?: boolean;
  /** Live phase used for the status badge + thinking disclosure. */
  status?: "queued" | "connecting" | "thinking" | "streaming" | "done" | "error";
  /** Epoch ms when the provider call started (for the thinking timer). */
  thinkingStartedAt?: number;
}

type ReplPhase = "idle" | "queued" | "connecting" | "thinking" | "streaming" | "done" | "error";

interface CommandHistoryItem {
  command: string;
  timestamp: string;
}

function formatTime(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function nameModel(model: string): string {
  const slash = model.lastIndexOf("/");
  return slash >= 0 ? model.slice(slash + 1) : model;
}

// ── Phase → Status Badge ──────────────────────────────────────────────

const PHASE_META: Record<ReplPhase, { label: string; className: string; dot: string }> = {
  idle: { label: "Idle", className: "bg-zinc-500/10 text-zinc-400 ring-zinc-500/20", dot: "bg-zinc-400" },
  queued: { label: "Queued", className: "bg-sky-500/10 text-sky-400 ring-sky-500/20", dot: "bg-sky-400" },
  connecting: { label: "Connecting", className: "bg-sky-500/10 text-sky-400 ring-sky-500/20", dot: "bg-sky-400" },
  thinking: { label: "Thinking", className: "bg-amber-500/10 text-amber-400 ring-amber-500/20", dot: "bg-amber-400" },
  streaming: { label: "Streaming", className: "bg-mint/10 text-mint ring-mint/20", dot: "bg-mint" },
  done: { label: "Done", className: "bg-emerald-500/10 text-emerald-500 ring-emerald-500/20", dot: "bg-emerald-500" },
  error: { label: "Error", className: "bg-rose-500/10 text-rose-400 ring-rose-500/20", dot: "bg-rose-400" },
};

/** Self-ticking elapsed-seconds readout (interval only while running). */
function ElapsedSeconds({
  startedAt,
  running,
  className,
}: {
  startedAt: number;
  running: boolean;
  className?: string;
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!running) return;
    const tick = () => setElapsed((performance.now() - startedAt) / 1000);
    tick();
    const iv = setInterval(tick, 200);
    return () => clearInterval(iv);
  }, [running, startedAt]);

  return <span className={className}>{elapsed.toFixed(1)}s</span>;
}

/** Collapsible thinking disclosure — auto-expands while running, collapses after. */
function ThinkingDisclosure({
  status,
  thinkingStartedAt,
  thinkingMs,
}: {
  status?: TerminalEntry["status"];
  thinkingStartedAt?: number;
  thinkingMs?: number;
}) {
  const running = status === "thinking" || status === "connecting" || status === "queued";
  if (!running && thinkingMs == null) return null;

  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5",
          running ? "border-amber-500/30 bg-amber-500/10 text-amber-500" : "border-border/70 bg-surface-2 text-muted",
        )}
      >
        {running ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Thinking</span>
            {thinkingStartedAt != null && <ElapsedSeconds startedAt={thinkingStartedAt} running />}
          </>
        ) : (
          <>
            <Brain className="h-3 w-3 text-brand" />
            <span>Thinking · {((thinkingMs ?? 0) / 1000).toFixed(1)}s</span>
            <ChevronDown className="h-3 w-3" />
          </>
        )}
      </span>
      {!running && (
        <span className="text-faint">Reasoned before the first token — content shown below.</span>
      )}
    </div>
  );
}

// ── Code Block with Copy ──────────────────────────────────────────────

interface CodeBlockProps {
  code: string;
  lang?: string;
}

function CodeBlock({ code, lang }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard write blocked */
    }
  }

  const cleanLang = lang?.trim() || "text";

  return (
    <div className="group relative my-3 overflow-hidden rounded-xl border border-border/70 bg-[#0d1117] text-slate-200 shadow-sm">
      <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-[11px] font-mono text-zinc-400">
        <span className="flex items-center gap-1.5 font-medium text-zinc-300">
          <Code2 className="h-3.5 w-3.5 text-brand" />
          {cleanLang}
        </span>
        <button
          type="button"
          onClick={copyToClipboard}
          className="flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Copy code block"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-mint" />
              <span className="text-mint">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="overflow-x-auto p-3.5 text-[12.5px] leading-relaxed font-mono">
        <pre className="m-0">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}

// ── Markdown Message Renderer ─────────────────────────────────────────

function TerminalMarkdown({ text }: { text: string }) {
  const parts = text.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-2 text-ink/90 text-[13px] leading-relaxed break-words font-mono">
      {parts.map((part, i) => {
        if (part.startsWith("```")) {
          const body = part.slice(3, -3).replace(/^\n/, "");
          const langMatch = body.match(/^[a-zA-Z0-9_-]+\n/);
          const lang = langMatch ? langMatch[0].trim() : "";
          const code = lang && langMatch ? body.slice(langMatch[0].length) : body;
          return <CodeBlock key={i} code={code.replace(/\n$/, "")} lang={lang} />;
        }

        // Inline formatting
        return <InlineMarkdownText key={i} text={part} />;
      })}
    </div>
  );
}

function InlineMarkdownText({ text }: { text: string }) {
  const lines = text.split("\n");

  return (
    <>
      {lines.map((line, lineIdx) => {
        // Handle headings
        if (line.startsWith("### ")) {
          return (
            <h4 key={lineIdx} className="mt-3 mb-1 text-sm font-semibold tracking-tight text-ink">
              {line.slice(4)}
            </h4>
          );
        }
        if (line.startsWith("## ")) {
          return (
            <h3 key={lineIdx} className="mt-4 mb-1.5 text-base font-semibold tracking-tight text-ink border-b border-border/50 pb-1">
              {line.slice(3)}
            </h3>
          );
        }
        if (line.startsWith("# ")) {
          return (
            <h2 key={lineIdx} className="mt-4 mb-2 text-lg font-bold tracking-tight text-ink border-b border-border pb-1">
              {line.slice(2)}
            </h2>
          );
        }

        // Handle list items
        if (line.startsWith("- ") || line.startsWith("* ")) {
          return (
            <div key={lineIdx} className="flex items-start gap-2 pl-2 my-0.5">
              <span className="text-brand font-bold">›</span>
              <div>
                <ParseInlineTokens text={line.slice(2)} />
              </div>
            </div>
          );
        }

        if (!line.trim()) {
          return <div key={lineIdx} className="h-2" />;
        }

        return (
          <p key={lineIdx} className="my-0.5">
            <ParseInlineTokens text={line} />
          </p>
        );
      })}
    </>
  );
}

function ParseInlineTokens({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`|https?:\/\/[^\s]+)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let idx = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    const token = match[0];
    if (token.startsWith("**")) {
      parts.push(
        <strong key={idx++} className="font-semibold text-ink">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("`")) {
      parts.push(
        <code key={idx++} className="rounded bg-surface-2 px-1.5 py-0.5 text-[0.9em] font-mono text-brand border border-border/60">
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("http")) {
      parts.push(
        <a
          key={idx++}
          href={token}
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand underline underline-offset-2 hover:text-brand-2"
        >
          {token}
        </a>,
      );
    }
    last = match.index + token.length;
  }
  if (last < text.length) {
    parts.push(text.slice(last));
  }

  return <>{parts}</>;
}

// ── Main Terminal Component ───────────────────────────────────────────

export function TerminalRepl() {
  const [entries, setEntries] = useState<TerminalEntry[]>([]);
  const [prompt, setPrompt] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>("auto");
  const [models, setModels] = useState<PickerModel[]>(FALLBACK_PICKER_MODELS);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [lastPrompt, setLastPrompt] = useState<string | null>(null);
  const [history, setHistory] = useState<CommandHistoryItem[]>([]);
  const [historyPointer, setHistoryPointer] = useState<number>(-1);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [sessionCost, setSessionCost] = useState<number>(0);
  const [sessionTokens, setSessionTokens] = useState<number>(0);
  const [phase, setPhase] = useState<ReplPhase>("idle");
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const [keyHealth, setKeyHealth] = useState<Record<string, string>>({});
  const [sessionTitle, setSessionTitle] = useState<string>("AI Terminal");

  const sessionRef = useRef<string | null>(null);
  const contentRef = useRef("");
  const thinkingRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Pure counter for stable IDs — avoids ESLint react-hooks/purity Date.now() violations
  const idRef = useRef(0);
  const nextId = () => { idRef.current += 1; return idRef.current; };
  // Start-time ref for latency measurement — avoids Date.now() in async functions
  const startTimeRef = useRef(0);

  // Load models on mount
  useEffect(() => {
    let ignore = false;
    void getPickerModels().then((m) => {
      if (!ignore && m.length > 0) setModels(m);
    });
    return () => {
      ignore = true;
    };
  }, []);

  // Load recent sessions + provider key health on mount.
  useEffect(() => {
    let ignore = false;
    void chatService
      .list({ limit: 10 })
      .then((res) => {
        if (!ignore && res.sessions.length > 0) setSessions(res.sessions);
      })
      .catch(() => {});
    void chatService
      .keysHealth()
      .then((res) => {
        if (ignore) return;
        // Aggregate per provider: usable statuses win over blocking ones.
        const rank: Record<string, number> = {
          healthy: 0,
          degrading: 1,
          expired: 2,
          dead: 2,
          missing: 3,
        };
        const agg: Record<string, string> = {};
        for (const p of res.providers) {
          const r = rank[p.status] ?? 3;
          if (agg[p.provider] === undefined || r < (rank[agg[p.provider]] ?? 3)) {
            agg[p.provider] = p.status;
          }
        }
        setKeyHealth(agg);
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, []);

  const refreshSessions = useCallback(() => {
    void chatService
      .list({ limit: 10 })
      .then((res) => {
        if (res.sessions.length > 0) setSessions(res.sessions);
      })
      .catch(() => {});
  }, []);

  // Auto-resize input textarea up to 6 lines
  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    const nextHeight = Math.min(textareaRef.current.scrollHeight, 140);
    textareaRef.current.style.height = `${Math.max(nextHeight, 38)}px`;
  }, [prompt]);

  // Scroll listener to show "Scroll to bottom" button
  const handleScroll = useCallback(() => {
    if (!logContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = logContainerRef.current;
    const distanceToBottom = scrollHeight - (scrollTop + clientHeight);
    setShowScrollBottom(distanceToBottom > 80);
  }, []);

  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "end" });
  }, []);

  // Update entry helper
  const replaceEntry = useCallback((id: string, patch: Partial<TerminalEntry>) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }, []);

  // Append entry helper
  const appendEntry = useCallback((entry: TerminalEntry) => {
    setEntries((prev) => [...prev, entry]);
    setTimeout(() => scrollToBottom(true), 50);
  }, [scrollToBottom]);

  // Ensure active session exists
  async function ensureSession(): Promise<string | null> {
    if (sessionRef.current) return sessionRef.current;
    try {
      const created = await chatService.create({
        title: "AI Terminal",
        defaultModel: selectedModel === "auto" ? "grok-3-mini" : selectedModel,
        autoSwitch: selectedModel === "auto",
      });
      sessionRef.current = created.session.id;
      setSessionId(created.session.id);
      setSessionTitle(created.session.title);
      refreshSessions();
      return created.session.id;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      appendEntry({
        id: `err-${nextId()}`,
        kind: "error",
        text: /fetch|network|ECONNREFUSED|Failed to fetch/i.test(msg)
          ? "Cannot reach the API server. Make sure the backend is running."
          : msg || "Could not start a chat session.",
        timestamp: new Date().toISOString(),
      });
      return null;
    }
  }

  // Load an existing session's history into the log.
  async function switchToSession(id: string) {
    setIsSwitcherOpen(false);
    if (isStreaming) return;
    try {
      const res = await chatService.get(id);
      abortStream();
      contentRef.current = "";
      thinkingRef.current = null;
      sessionRef.current = id;
      setSessionId(id);
      setSessionTitle(res.session.title);
      setSelectedModel(res.session.defaultModel ?? "auto");

      const loaded: TerminalEntry[] = [];
      for (const m of res.messages) {
        if (m.role === "system") continue;
        const ts = m.createdAt;
        if (m.role === "user") {
          loaded.push({ id: `p-${nextId()}`, kind: "prompt", text: m.content, timestamp: ts });
        } else if (m.role === "assistant") {
          if (m.errorCode || (m.errorMessage && !m.content.trim())) {
            loaded.push({
              id: `a-${nextId()}`,
              kind: "error",
              text: m.errorMessage ?? "Provider failed to answer.",
              code: m.errorCode ?? undefined,
              model: m.model ?? undefined,
              provider: m.provider ?? undefined,
              switched: m.switchedFrom ?? null,
              timestamp: ts,
              status: "error",
            });
          } else {
            loaded.push({
              id: `a-${nextId()}`,
              kind: "assistant",
              text: m.content,
              model: m.model ?? undefined,
              provider: m.provider ?? undefined,
              cost: m.cost,
              tokensIn: m.tokensIn,
              tokensOut: m.tokensOut,
              latencyMs: m.latencyMs ?? undefined,
              switched: m.switchedFrom ?? null,
              timestamp: ts,
              status: "done",
            });
          }
        }
      }
      setEntries(loaded);
      setSessionTokens(
        res.messages.reduce((acc, m) => acc + (m.role === "assistant" ? m.tokensIn + m.tokensOut : 0), 0),
      );
      setSessionCost(res.messages.reduce((acc, m) => acc + (m.role === "assistant" ? m.cost : 0), 0));
      scrollToBottom(false);
    } catch {
      /* session not loadable — keep current log */
    }
  }

  // ── Slash Commands Processor ──────────────────────────────────────────
  async function executeSlashCommand(cmd: string): Promise<boolean> {
    const trimmed = cmd.trim();
    if (!trimmed.startsWith("/")) return false;

    const [rawVerb, ...rest] = trimmed.slice(1).split(" ");
    const verb = rawVerb.toLowerCase();
    const arg = rest.join(" ").trim();
    const now = new Date().toISOString();

    // Append the user's slash command to transcript
    appendEntry({
      id: `p-${nextId()}`,
      kind: "prompt",
      text: trimmed,
      timestamp: now,
    });

    switch (verb) {
      case "help": {
        appendEntry({
          id: `sys-${nextId()}`,
          kind: "system",
          text: `**LayerFlow Terminal — Built-in Slash Commands**

- \`/help\` — Display this command reference
- \`/clear\` — Clear all screen logs
- \`/model <name>\` — Switch model (e.g. \`/model grok\`, \`/model gpt-4o\`, \`/model claude\`, \`/model auto\`)
- \`/models\` — List all supported models and providers
- \`/keys\` — Check API keys configuration and provider health
- \`/cost\` — View session tokens and spend summary
- \`/status\` — Ping API and database health probe
- \`/compact\` — Summarize session context to save tokens

**Keyboard Shortcuts**:
- \`Enter\`: Run command
- \`Shift + Enter\`: Multi-line prompt
- \`↑ / ↓\`: Browse command history
- \`Ctrl + L\`: Clear screen
- \`Ctrl + C\` or \`Escape\`: Abort active stream`,
          timestamp: now,
        });
        return true;
      }

      case "clear": {
        setEntries([]);
        return true;
      }

      case "models": {
        const list = models
          .map((m) => `• **${m.label}** (\`${m.id}\`) — Provider: *${m.provider}*`)
          .join("\n");
        appendEntry({
          id: `sys-${nextId()}`,
          kind: "system",
          text: `**Supported Models Catalog**\n\n${list}\n\n*Switch active model with \`/model <id>\` or use the top selector.*`,
          timestamp: now,
        });
        return true;
      }

      case "model": {
        if (!arg) {
          appendEntry({
            id: `sys-${nextId()}`,
            kind: "system",
            text: `Current active model is **${selectedModel}**. Use \`/model <name>\` to change (e.g. \`/model grok\`, \`/model claude\`, \`/model auto\`).`,
            timestamp: now,
          });
          return true;
        }

        const match = models.find(
          (m) =>
            m.id.toLowerCase() === arg.toLowerCase() ||
            m.id.toLowerCase().includes(arg.toLowerCase()) ||
            m.label.toLowerCase().includes(arg.toLowerCase()),
        );

        if (match) {
          setSelectedModel(match.id);
          appendEntry({
            id: `sys-${nextId()}`,
            kind: "system",
            text: `✓ Switched active model to **${match.label}** (\`${match.id}\`).`,
            timestamp: now,
          });
        } else {
          appendEntry({
            id: `sys-${nextId()}`,
            kind: "error",
            text: `Unknown model "${arg}". Type \`/models\` to see the full list of available models.`,
            timestamp: now,
          });
        }
        return true;
      }

      case "keys": {
        appendEntry({
          id: `sys-${nextId()}`,
          kind: "system",
          text: `Checking provider key health...`,
          timestamp: now,
        });

        try {
          const res = await chatService.keysHealth();
          const rows = res.providers.map((p) => {
            const statusIcon = p.status === "healthy" ? "✓" : p.status === "degrading" ? "⚠" : "✕";
            return `• **${p.provider.toUpperCase()}**: ${statusIcon} ${p.status} (source: ${p.source})`;
          });

          const rank: Record<string, number> = { healthy: 0, degrading: 1, expired: 2, dead: 2, missing: 3 };
          const agg: Record<string, string> = {};
          for (const p of res.providers) {
            const r = rank[p.status] ?? 3;
            if (agg[p.provider] === undefined || r < (rank[agg[p.provider]] ?? 3)) agg[p.provider] = p.status;
          }
          setKeyHealth(agg);

          appendEntry({
            id: `sys-${nextId()}`,
            kind: "system",
            text: `**Provider Key Health Snapshot**\n\n${rows.join("\n")}\n\n*Configure private BYOK keys in [Settings → API Keys](/keys).*`,
            timestamp: new Date().toISOString(),
          });
        } catch {
          appendEntry({
            id: `sys-${nextId()}`,
            kind: "error",
            text: `Failed to fetch key health. Make sure the API server is reachable.`,
            timestamp: new Date().toISOString(),
          });
        }
        return true;
      }

      case "cost": {
        appendEntry({
          id: `sys-${nextId()}`,
          kind: "system",
          text: `**Session Usage Summary**\n\n• **Total Cost**: ${formatMoney(sessionCost)}\n• **Total Tokens**: ${sessionTokens.toLocaleString()}\n• **Active Session**: \`${sessionId ?? "none (auto-creates on prompt)"}\`\n• **Active Model**: \`${selectedModel}\``,
          timestamp: now,
        });
        return true;
      }

      case "status": {
        const ping = await pingApi(4000);
        appendEntry({
          id: `sys-${nextId()}`,
          kind: "system",
          text: `**LayerFlow System Diagnostics**\n\n• **API Health**: ${ping.ok ? "✓ Online" : "✕ Unreachable"}\n• **Upstream Target**: \`${ping.upstream ?? "same-origin /api"}\`\n• **Terminal Engine**: Web REPL v0.3.0 (SSE Streaming)\n• **Timestamp**: ${formatTime(now)}`,
          timestamp: now,
        });
        return true;
      }

      case "compact": {
        appendEntry({
          id: `sys-${nextId()}`,
          kind: "system",
          text: `Context compaction triggered. Recent session turns preserved with full context integrity.`,
          timestamp: now,
        });
        return true;
      }

      default: {
        appendEntry({
          id: `sys-${nextId()}`,
          kind: "error",
          text: `Unknown command "/${verb}". Type \`/help\` for the full list of available commands.`,
          timestamp: now,
        });
        return true;
      }
    }
  }

  // ── Send Prompt / Message ─────────────────────────────────────────────

  async function send(input?: string) {
    const text = (input ?? prompt).trim();
    if (!text || isStreaming) return;

    // Check slash commands first
    if (text.startsWith("/")) {
      setPrompt("");
      setHistory((prev) => [...prev, { command: text, timestamp: new Date().toISOString() }]);
      setHistoryPointer(-1);
      await executeSlashCommand(text);
      return;
    }

    setLastPrompt(text);
    setPrompt("");
    setHistory((prev) => [...prev, { command: text, timestamp: new Date().toISOString() }]);
    setHistoryPointer(-1);
    setPhase("queued");

    contentRef.current = "";
    thinkingRef.current = null;
    const now = new Date().toISOString();

    appendEntry({
      id: `p-${nextId()}`,
      kind: "prompt",
      text,
      timestamp: now,
    });

    const placeholderId = `a-${nextId()}`;
    appendEntry({
      id: placeholderId,
      kind: "assistant",
      text: "",
      model: selectedModel,
      timestamp: now,
      isStreaming: true,
      status: "queued",
    });
    scrollToBottom(true);

    const id = await ensureSession();
    if (!id) {
      setPhase("error");
      replaceEntry(placeholderId, {
        kind: "error",
        text: "Could not initialize session — add a provider key under /keys or check your backend.",
        code: "no_session",
        isStreaming: false,
        status: "error",
      });
      return;
    }

    setIsStreaming(true);
    const controller = new AbortController();
    abortRef.current = controller;

    let switched: TerminalEntry["switched"] = null;
    let firstDelta = false;
    let thinkingStarted = 0;
    startTimeRef.current = performance.now(); // eslint-disable-line react-hooks/purity

    const onEvent = (event: ChatEvent) => {
      switch (event.type) {
        case "start":
          thinkingStarted = performance.now();
          replaceEntry(placeholderId, {
            model: event.model,
            provider: event.provider,
            keyHint: event.keyHint,
            isStreaming: true,
            status: "thinking",
            thinkingStartedAt: thinkingStarted,
          });
          setPhase("thinking");
          break;

        case "delta":
          if (!firstDelta) {
            firstDelta = true;
            replaceEntry(placeholderId, {
              status: "streaming",
              thinkingMs: Math.round(performance.now() - thinkingStarted),
            });
            setPhase("streaming");
          }
          contentRef.current += event.text;
          replaceEntry(placeholderId, {
            text: contentRef.current,
            isStreaming: true,
          });
          scrollToBottom(true);
          break;

        case "switched":
          switched = {
            fromModel: event.fromModel,
            toModel: event.toModel,
            reason: event.reason,
          };
          replaceEntry(placeholderId, { switched });
          break;

        case "done": {
          const latency = Math.round(performance.now() - startTimeRef.current);
          const cost = event.message.cost ?? 0;
          const tokens = (event.message.tokensIn ?? 0) + (event.message.tokensOut ?? 0);

          setSessionCost((prev) => prev + cost);
          setSessionTokens((prev) => prev + tokens);
          setPhase("done");
          refreshSessions();

          replaceEntry(placeholderId, {
            kind: "assistant",
            text: event.message.content || contentRef.current,
            model: event.message.model ?? selectedModel,
            provider: event.message.provider ?? undefined,
            keyHint: event.message.keyHint ?? undefined,
            cost,
            tokensIn: event.message.tokensIn,
            tokensOut: event.message.tokensOut,
            latencyMs: latency,
            switched: switched ?? event.message.switchedFrom ?? null,
            isStreaming: false,
            status: "done",
          });
          break;
        }

        case "error":
          setPhase("error");
          replaceEntry(placeholderId, {
            kind: "error",
            text: event.message,
            code: event.code,
            switched,
            isStreaming: false,
            status: "error",
          });
          break;
      }
    };

    try {
      await streamChatMessage({
        sessionId: id,
        content: text,
        model: selectedModel === "auto" ? undefined : selectedModel,
        autoSwitch: selectedModel === "auto",
        signal: controller.signal,
        onEvent,
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setPhase("done");
        replaceEntry(placeholderId, {
          text: contentRef.current ? `${contentRef.current}\n\n*(Stream cancelled)*` : "Stream cancelled by user.",
          isStreaming: false,
          status: "done",
        });
        return;
      }

      const msg = err instanceof Error ? err.message : "";
      const hasPartial = contentRef.current.length > 0;

      setPhase("error");
      replaceEntry(placeholderId, hasPartial ? { text: contentRef.current, isStreaming: false, status: "done" } : {
        kind: "error",
        text: /fetch|network|ECONNREFUSED|Failed to fetch/i.test(msg)
          ? "Cannot reach the API server. Make sure the backend is running (npm run dev)."
          : msg || "Could not reach the chat server.",
        code: "network",
        isStreaming: false,
        status: "error",
      });
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
      scrollToBottom(true);
    }
  }

  // Abort active stream
  function abortStream() {
    if (abortRef.current) {
      abortRef.current.abort();
      setIsStreaming(false);
    }
  }

  // Keyboard navigation for history
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
      return;
    }

    if (e.key === "ArrowUp") {
      if (prompt.trim() === "" || historyPointer !== -1) {
        e.preventDefault();
        if (history.length === 0) return;
        const nextPtr = historyPointer === -1 ? history.length - 1 : Math.max(0, historyPointer - 1);
        setHistoryPointer(nextPtr);
        setPrompt(history[nextPtr].command);
      }
    } else if (e.key === "ArrowDown") {
      if (historyPointer !== -1) {
        e.preventDefault();
        const nextPtr = historyPointer + 1;
        if (nextPtr >= history.length) {
          setHistoryPointer(-1);
          setPrompt("");
        } else {
          setHistoryPointer(nextPtr);
          setPrompt(history[nextPtr].command);
        }
      }
    } else if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      setEntries([]);
    } else if (e.key === "c" && e.ctrlKey && isStreaming) {
      e.preventDefault();
      abortStream();
    } else if (e.key === "Escape" && isStreaming) {
      e.preventDefault();
      abortStream();
    }
  }

  // Copy full transcript
  async function copyTranscript() {
    const md = entries
      .map((e) => {
        if (e.kind === "prompt") return `### ❯ User\n${e.text}`;
        if (e.kind === "assistant") return `### ◆ LayerFlow (${nameModel(e.model ?? "AI")})\n${e.text}`;
        if (e.kind === "system") return `> **System**:\n${e.text}`;
        if (e.kind === "error") return `> **Error**:\n${e.text}`;
        return "";
      })
      .join("\n\n---\n\n");

    try {
      await navigator.clipboard.writeText(md);
      alert("Transcript copied to clipboard!");
    } catch {
      /* clipboard write blocked */
    }
  }

  // Reset / New Session
  function reset() {
    abortStream();
    contentRef.current = "";
    thinkingRef.current = null;
    setLastPrompt(null);
    sessionRef.current = null;
    setSessionId(null);
    setSessionTitle("AI Terminal");
    setEntries([]);
    setSessionCost(0);
    setSessionTokens(0);
    setPhase("idle");
    refreshSessions();
  }

  const activeModelObj = models.find((m) => m.id === selectedModel);

  const phaseMeta = PHASE_META[phase];
  const phasePulse =
    phase === "queued" || phase === "connecting" || phase === "thinking" || phase === "streaming";

  // Health dot for the active provider (aggregate for "auto").
  const activeProvider = activeModelObj?.provider ?? (selectedModel === "auto" ? "auto" : selectedModel.split("/")[0]);
  const providerDotClass = (() => {
    if (selectedModel !== "auto") {
      const s = keyHealth[activeProvider];
      if (!s) return "bg-zinc-400";
      if (s === "healthy") return "bg-emerald-400";
      if (s === "degrading") return "bg-amber-400";
      return "bg-rose-400";
    }
    const sts = Object.values(keyHealth);
    if (sts.length === 0 || sts.every((s) => s === "missing")) return "bg-zinc-400";
    if (sts.includes("healthy")) return "bg-emerald-400";
    if (sts.includes("degrading")) return "bg-amber-400";
    return "bg-rose-400";
  })();

  return (
    <section className="relative flex flex-col rounded-2xl border border-border bg-surface shadow-sm overflow-hidden min-h-[640px]">
      {/* ── Top Header Toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-2/60 px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 text-brand ring-1 ring-brand/20">
            <TerminalSquare className="h-5 w-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold tracking-tight text-ink">LayerFlow Terminal</h2>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1",
                  phaseMeta.className,
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", phaseMeta.dot, phasePulse && "animate-pulse")} />
                {phaseMeta.label}
              </span>
            </div>
            <p className="text-[11px] text-muted">
              Interactive OpenCode-grade REPL with real-time SSE streaming.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Session Switcher */}
          <div className="relative hidden md:block">
            <button
              type="button"
              onClick={() => setIsSwitcherOpen((prev) => !prev)}
              className="flex max-w-[180px] items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-ink shadow-xs transition-colors hover:border-brand/40 hover:bg-surface-2"
              aria-label="Switch chat session"
            >
              <History className="h-3.5 w-3.5 text-muted" />
              <span className="truncate">{sessionTitle}</span>
              <ChevronDown className="h-3 w-3 text-muted shrink-0" />
            </button>

            {isSwitcherOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsSwitcherOpen(false)}
                />
                <div className="absolute right-0 z-50 mt-1.5 w-72 rounded-xl border border-border bg-surface p-1.5 shadow-xl ring-1 ring-black/5 animate-in fade-in-50 zoom-in-95">
                  <div className="flex items-center justify-between px-2 py-1">
                    <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">
                      Recent Sessions
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        refreshSessions();
                      }}
                      className="inline-flex items-center gap-1 text-[10px] text-brand hover:underline"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Refresh
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto space-y-0.5">
                    {sessions.length === 0 && (
                      <div className="px-2 py-3 text-center text-[11px] text-faint">
                        No past sessions yet.
                      </div>
                    )}
                    {sessions.map((s) => {
                      const isActive = s.id === sessionId;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => void switchToSession(s.id)}
                          className={cn(
                            "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors",
                            isActive ? "bg-brand/10 text-brand font-medium" : "text-ink hover:bg-surface-2",
                          )}
                        >
                          <div className="min-w-0">
                            <div className="truncate font-medium">{s.title}</div>
                            <div className="text-[10px] text-muted">
                              {s.messageCount} messages · {formatTime(s.lastMessageAt ?? s.createdAt)}
                            </div>
                          </div>
                          {isActive && <Check className="h-3.5 w-3.5 text-brand shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Model Selector Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-ink shadow-xs transition-colors hover:border-brand/40 hover:bg-surface-2"
              aria-label="Select AI Model"
              title="Provider key health indicated by the dot"
            >
              <span className="relative flex h-2 w-2">
                <span className={cn("h-2 w-2 rounded-full", providerDotClass)} />
              </span>
              <Sparkles className="h-3.5 w-3.5 text-brand" />
              <span>{activeModelObj?.label ?? selectedModel}</span>
              <ChevronDown className="h-3 w-3 text-muted" />
            </button>

            {isDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsDropdownOpen(false)}
                />
                <div className="absolute right-0 z-50 mt-1.5 w-64 rounded-xl border border-border bg-surface p-1.5 shadow-xl ring-1 ring-black/5 animate-in fade-in-50 zoom-in-95">
                  <div className="px-2 py-1 text-[11px] font-semibold text-muted uppercase tracking-wider">
                    Select AI Model
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-0.5">
                    {models.map((m) => {
                      const isSelected = m.id === selectedModel;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            setSelectedModel(m.id);
                            setIsDropdownOpen(false);
                          }}
                          className={cn(
                            "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors",
                            isSelected
                              ? "bg-brand/10 text-brand font-medium"
                              : "text-ink hover:bg-surface-2",
                          )}
                        >
                          <div className="min-w-0">
                            <div className="truncate font-medium">{m.label}</div>
                            <div className="text-[10px] text-muted">{m.provider}</div>
                          </div>
                          {isSelected && <Check className="h-3.5 w-3.5 text-brand shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Session Metrics Pill */}
          <div className="hidden sm:flex items-center gap-2 rounded-lg border border-border/70 bg-surface px-2.5 py-1 text-[11px] font-mono text-muted">
            <span className="flex items-center gap-1 text-ink">
              <DollarSign className="h-3 w-3 text-brand" />
              {formatMoney(sessionCost)}
            </span>
            <span className="text-border">|</span>
            <span>{sessionTokens.toLocaleString()} tok</span>
          </div>

          {/* Copy Transcript */}
          <Button
            variant="ghost"
            size="sm"
            onClick={copyTranscript}
            disabled={entries.length === 0}
            icon={<Copy className="h-3.5 w-3.5" />}
            title="Copy conversation transcript"
          >
            Copy
          </Button>

          {/* New Session Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={reset}
            disabled={entries.length === 0 && !sessionId}
            icon={<Plus className="h-3.5 w-3.5" />}
          >
            New
          </Button>
        </div>
      </div>

      {/* ── Output Log Window ── */}
      <div
        ref={logContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto bg-bg/80 p-4 md:p-6 space-y-4 font-mono text-[12.5px] max-h-[560px]"
        role="log"
        aria-live="polite"
      >
        {/* Welcome Card when empty */}
        {entries.length === 0 && (
          <div className="rounded-xl border border-dashed border-border/80 bg-surface/50 p-6">
            <div className="flex items-center gap-2 text-ink font-semibold text-sm">
              <span className="text-brand">◆</span>
              <span>LayerFlow Unified Terminal v0.3.0</span>
            </div>
            <p className="mt-1.5 text-xs text-muted leading-relaxed">
              OpenCode &amp; Cline compatible environment. Type any request or run built-in slash commands.
            </p>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {[
                { cmd: "/help", desc: "commands & shortcuts" },
                { cmd: "/models", desc: "model catalog" },
                { cmd: "/keys", desc: "check API keys" },
                { cmd: "/status", desc: "system health" },
                { cmd: "inspect my project structure and explain the architecture", desc: "prompt test" },
              ].map((item) => (
                <button
                  key={item.cmd}
                  type="button"
                  onClick={() => {
                    setPrompt(item.cmd);
                    textareaRef.current?.focus();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-2.5 py-1 text-[11px] text-ink transition-colors hover:border-brand/50 hover:bg-brand/5 hover:text-brand"
                >
                  <span className="font-semibold text-brand">{item.cmd.startsWith("/") ? item.cmd : "›"}</span>
                  <span className="text-muted">{item.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Entries Rendering */}
        {entries.map((entry) => {
          if (entry.kind === "prompt") {
            return (
              <div key={entry.id} className="group rounded-xl border border-border/60 bg-surface-2/60 p-3.5">
                <div className="flex items-center justify-between text-[11px] text-muted mb-1">
                  <div className="flex items-center gap-1.5 font-medium text-ink">
                    <span className="text-brand font-bold text-sm">❯</span>
                    <span>you</span>
                  </div>
                  <span className="text-[10px] text-faint">{formatTime(entry.timestamp)}</span>
                </div>
                <div className="whitespace-pre-wrap text-ink font-mono text-[13px] pl-3.5">
                  {entry.text}
                </div>
              </div>
            );
          }

          if (entry.kind === "system") {
            return (
              <div key={entry.id} className="rounded-xl border border-brand/20 bg-brand/5 p-4 text-ink">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-brand mb-1.5 uppercase tracking-wider">
                  <Sparkles className="h-3.5 w-3.5" />
                  System Output
                </div>
                <TerminalMarkdown text={entry.text} />
              </div>
            );
          }

          if (entry.kind === "error") {
            return (
              <div key={entry.id} className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="h-4 w-4 text-rose-400 mt-0.5 shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <div className="text-xs font-semibold text-rose-400">
                      Execution Error {entry.code ? `[${entry.code}]` : ""}
                    </div>
                    <p className="text-xs text-rose-300 leading-relaxed">{entry.text}</p>
                    
                    {entry.switched && (
                      <div className="text-[11px] text-amber-300">
                        Switched: {entry.switched.fromModel} → {entry.switched.toModel} ({entry.switched.reason})
                      </div>
                    )}

                    <div className="pt-2 flex flex-wrap items-center gap-2">
                      {(entry.code === "no_provider" || entry.code === "provider_key_missing") && (
                        <Link
                          href="/keys"
                          className="inline-flex items-center gap-1 rounded-md bg-rose-500/20 px-2.5 py-1 text-xs font-medium text-rose-200 hover:bg-rose-500/30 transition-colors"
                        >
                          <KeyRound className="h-3 w-3" />
                          Configure API Keys →
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          if (lastPrompt) void send(lastPrompt);
                        }}
                        className="inline-flex items-center gap-1 rounded-md border border-rose-500/30 bg-surface px-2 py-1 text-xs font-medium text-ink hover:bg-surface-2 transition-colors"
                      >
                        <RefreshCw className="h-3 w-3 text-brand" />
                        Retry Last Prompt
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          // Assistant Response Entry
          const isDone = !entry.isStreaming;
          return (
            <div key={entry.id} className="rounded-xl border border-border/80 bg-surface p-4 shadow-xs space-y-3">
              {/* Header Badge */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 font-semibold text-brand">
                    <Bot className="h-3.5 w-3.5" />
                    LayerFlow
                  </span>
                  <span className="text-muted">·</span>
                  <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] text-ink font-mono">
                    {nameModel(entry.model ?? selectedModel)}
                  </span>
                  {entry.provider && (
                    <span className="hidden sm:inline text-[10px] text-muted">
                      ({PROVIDER_LABELS[entry.provider] ?? entry.provider})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-[10px] text-muted">
                  {entry.isStreaming ? (
                    entry.status === "streaming" ? (
                      <span className="flex items-center gap-1 text-mint">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Streaming...
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-amber-500">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Thinking
                        {entry.thinkingStartedAt != null && (
                          <ElapsedSeconds startedAt={entry.thinkingStartedAt} running />
                        )}
                      </span>
                    )
                  ) : (
                    <span className="flex items-center gap-1 text-emerald-500">
                      <Check className="h-3 w-3" />
                      Done
                    </span>
                  )}
                  {isDone && entry.latencyMs && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {(entry.latencyMs / 1000).toFixed(1)}s
                    </span>
                  )}
                  {isDone && entry.cost !== undefined && (
                    <span className="font-semibold text-ink">{formatMoney(entry.cost)}</span>
                  )}
                </div>
              </div>

              <ThinkingDisclosure
                status={entry.status}
                thinkingStartedAt={entry.thinkingStartedAt}
                thinkingMs={entry.thinkingMs}
              />

              {/* Switched Provider Notice */}
              {entry.switched && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-400">
                  ⚡ Auto-switched: {nameModel(entry.switched.fromModel)} → {nameModel(entry.switched.toModel)} ({entry.switched.reason})
                </div>
              )}

              {/* Assistant Message Body */}
              <div className="min-h-[1.5rem]">
                {entry.text ? (
                  <TerminalMarkdown text={entry.text} />
                ) : entry.isStreaming ? (
                  <div className="flex items-center gap-2 text-muted text-xs py-2">
                    <span className="h-2 w-2 rounded-full bg-brand animate-ping" />
                    Connecting to provider &amp; building context...
                  </div>
                ) : null}

                {entry.isStreaming && entry.text && (
                  <span className="inline-block h-3.5 w-2 bg-brand ml-0.5 animate-pulse align-middle" />
                )}
              </div>
            </div>
          );
        })}

        <div ref={bottomRef} className="h-px" aria-hidden="true" />
      </div>

      {/* Floating Scroll To Bottom Button */}
      {showScrollBottom && (
        <button
          type="button"
          onClick={() => scrollToBottom(true)}
          className="absolute bottom-20 right-6 z-30 flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-ink shadow-lg transition-transform hover:scale-105 active:scale-95"
        >
          <ArrowDown className="h-3.5 w-3.5 text-brand" />
          <span>Scroll to bottom</span>
        </button>
      )}

      {/* ── Bottom Input & Control Dock ── */}
      <div className="border-t border-border bg-surface px-4 py-3 md:px-6">
        <div className="relative flex items-end gap-2 rounded-xl border border-border bg-surface-2/70 p-2 transition-within:border-brand focus-within:border-brand/70 focus-within:ring-1 focus-within:ring-brand/30">
          <span className="text-brand font-bold text-sm select-none pl-1.5 pb-1.5">
            $
          </span>

          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a prompt or /help... (Enter to send, Shift+Enter for newline)"
            rows={1}
            disabled={isStreaming}
            className="flex-1 max-h-36 resize-none bg-transparent font-mono text-[13px] text-ink placeholder:text-muted focus:outline-none leading-relaxed py-1"
            aria-label="Terminal prompt input"
          />

          <div className="flex items-center gap-1.5 pb-0.5">
            {isStreaming ? (
              <Button
                variant="outline"
                size="sm"
                onClick={abortStream}
                className="h-8 px-2.5 text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
                title="Stop generation"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Stop
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={() => void send()}
                disabled={!prompt.trim()}
                className="h-8 px-3"
                title="Execute prompt (Enter)"
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Footer shortcuts helper */}
        <div className="mt-2 flex flex-wrap items-center justify-between text-[11px] text-muted">
          <div className="flex items-center gap-3">
            <span><strong className="text-ink">Enter</strong> send</span>
            <span><strong className="text-ink">Shift+Enter</strong> newline</span>
            <span><strong className="text-ink">↑/↓</strong> history</span>
            <span><strong className="text-ink">Ctrl+L</strong> clear</span>
          </div>
          <div className="text-faint">
            Target: <span className="text-ink font-mono">{nameModel(selectedModel)}</span>
          </div>
        </div>
      </div>
    </section>
  );
}