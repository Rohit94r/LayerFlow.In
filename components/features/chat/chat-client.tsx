"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type {
  ChatEvent,
  ChatKeyHealth,
  ChatMessageRecord,
  ChatSession,
  ImprovePromptResponse,
} from "@layerflow/contracts";
import {
  AiChat,
  ClipboardPaste,
  LifeBuoy,
  Loader2,
  Plus,
  Trash2,
} from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { formatMoney, timeAgo } from "@/lib/data/providers";
import { chatService, streamChatMessage } from "@/lib/services/chat";
import { improveService } from "@/lib/services/improve";
import { memoryService } from "@/lib/services/memory";
import { rescueService } from "@/lib/services/rescue";
import { cn } from "@/lib/utils";
import { Composer } from "./composer";
import { ImprovePanel } from "./improve-panel";
import { MessageBubble, TypingIndicator, type UiMessage } from "./message-bubble";
import { ModelPicker } from "./model-picker";
import { PICKER_MODELS } from "./chat-models";
import { RescueDialog } from "./rescue-dialog";

const SESSION_HEIGHT = "h-[calc(100dvh-7rem)]";

function toUi(m: ChatMessageRecord): UiMessage {
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    model: m.model,
    provider: m.provider,
    keyHint: m.keyHint,
    cost: m.cost,
    createdAt: Date.parse(m.createdAt),
    error: m.errorMessage,
    switchedFrom: m.switchedFrom,
  };
}

function SessionItem({
  session,
  active,
  onClick,
}: {
  session: ChatSession;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-lg px-2.5 py-2 text-left transition-colors",
        active ? "bg-surface-2 text-ink" : "text-muted hover:bg-surface-2/60 hover:text-ink",
      )}
    >
      <div className="flex items-center gap-2">
        <AiChat className={cn("h-4 w-4 shrink-0", active ? "text-ink" : "text-faint")} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium">{session.title}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[10.5px] text-faint">
            {session.messageCount} msg{session.messageCount === 1 ? "" : "s"}
            {session.cost > 0 ? <> · {formatMoney(session.cost)}</> : null}
            {session.lastMessageAt ? <> · {timeAgo(session.lastMessageAt)}</> : null}
            {session.source === "rescue" ? (
              <>
                {" "}
                · <LifeBuoy className="inline h-3 w-3" />
              </>
            ) : null}
          </p>
        </div>
      </div>
    </button>
  );
}

function Hero({
  onRescueImport,
  onNewChat,
  onOpenRescue,
  busy,
}: {
  onRescueImport: () => void;
  onNewChat: () => void;
  onOpenRescue: () => void;
  busy: "rescue" | "new" | null;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1.5 px-4 text-center">
      <AiChat className="h-7 w-7 text-faint" />
      <h2 className="mt-2 text-xl font-semibold tracking-tight text-ink">Continue any chat, on any AI</h2>
      <p className="max-w-md text-sm leading-relaxed text-muted">
        Pick a model per message — or let LayerFlow auto-switch when a key runs out. Your thread and
        context never get lost.
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <Button
          size="sm"
          onClick={onNewChat}
          icon={busy === "new" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
        >
          New chat
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenRescue}
          icon={<LifeBuoy className="h-3.5 w-3.5" />}
        >
          Rescue a past chat
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onRescueImport}
          icon={busy === "rescue" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ClipboardPaste className="h-3.5 w-3.5" />}
        >
          Import from my rescue
        </Button>
      </div>
      <p className="mt-4 text-[11px] text-faint">
        Rescue brings a dead conversation back to life — a report loads it straight into a new thread here.{" "}
        <span className="text-brand">⌘I</span> improves any prompt before it runs.
      </p>
    </div>
  );
}

export function ChatClient() {
  const params = useParams();
  const router = useRouter();
  const sessionId = typeof params?.id === "string" ? params.id : undefined;

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [health, setHealth] = useState<ChatKeyHealth[]>([]);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [active, setActive] = useState<ChatSession | null>(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [rescueOpen, setRescueOpen] = useState(false);
  const [busy, setBusy] = useState<"rescue" | "new" | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [improveOpen, setImproveOpen] = useState(false);
  const [improveBusy, setImproveBusy] = useState(false);
  const [improveError, setImproveError] = useState<string | null>(null);
  const [improveResult, setImproveResult] = useState<ImprovePromptResponse | null>(null);

  const [saveBusy, setSaveBusy] = useState(false);
  const [lastReply, setLastReply] = useState<{ userText: string; text: string } | null>(null);

  const [stream, setStream] = useState<{
    placeholderId: string;
    content: string;
    model?: string;
    provider?: string;
  } | null>(null);
  const contentRef = useRef("");
  const streamAbortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const nearBottomRef = useRef(true);

  const streaming = stream !== null;
  const currentModel = active?.defaultModel ?? null;
  const autoSwitch = active?.autoSwitch ?? true;

  const refreshSessions = useCallback(async () => {
    try {
      const res = await chatService.list({ limit: 50 });
      setSessions(res.sessions);
    } catch {
      /* keep the stale list */
    }
  }, []);

  useEffect(() => {
    refreshSessions();
    chatService.keysHealth().then((res) => setHealth(res.providers)).catch(() => undefined);
  }, [refreshSessions]);

  // Load the active session whenever the route id changes.
  useEffect(() => {
    if (!sessionId) {
      setActive(null);
      setMessages([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    chatService
      .get(sessionId)
      .then((res) => {
        if (cancelled) return;
        setActive(res.session);
        setMessages(res.messages.map(toUi));
        const lastUser = [...res.messages].reverse().find((m) => m.role === "user");
        const lastAssistant = [...res.messages].reverse().find((m) => m.role === "assistant");
        setLastReply(
          lastUser && lastAssistant
            ? { userText: lastUser.content, text: lastAssistant.content }
            : null,
        );
      })
      .catch(() => {
        if (!cancelled) router.push("/chat");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId, router]);

  // Auto-scroll on new content (skip when the user has scrolled up).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (nearBottomRef.current) {
      el.scrollTo({ top: el.scrollHeight, behavior: messages.length > 4 && stream ? "smooth" : "auto" });
    }
  }, [messages, stream?.content]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    nearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const openSession = useCallback(
    (id: string) => {
      if (streaming) return;
      router.push(`/chat/${id}`);
    },
    [router, streaming],
  );

  async function newSession() {
    if (busy) return;
    setBusy("new");
    try {
      const created = await chatService.create({});
      streamAbortRef.current?.abort();
      router.push(`/chat/${created.session.id}`);
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Could not create the chat.");
    } finally {
      setBusy(null);
    }
  }

  async function importRescue() {
    if (busy) return;
    setBusy("rescue");
    try {
      const reports = await rescueService.listRescueReports();
      if (reports.length === 0) {
        setToast("No finished rescue report yet — rescue a chat right here to get one.");
        setRescueOpen(true);
        return;
      }
      const latest = reports[0];
      const created = await chatService.create({
        rescueReportId: latest.id,
        summary: latest.summary,
      });
      streamAbortRef.current?.abort();
      router.push(`/chat/${created.session.id}`);
      setToast("Rescue imported — continue your conversation from here.");
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Could not import the rescue.");
    } finally {
      setBusy(null);
    }
  }

  async function chooseModel(model: string) {
    if (!sessionId) return;
    // Reset the live stream before switching: abort the current provider call,
    // drop the temporary assistant draft, and clear cached stream state so the
    // next send goes to the NEW model with a clean provider session.
    if (streaming) {
      streamAbortRef.current?.abort();
      streamAbortRef.current = null;
      contentRef.current = "";
      setStream(null);
      setMessages((prev) => prev.filter((m) => m.id !== stream?.placeholderId));
    }
    try {
      const res = await chatService.switchModel(sessionId, model);
      setActive(res.session);
      void refreshSessions();
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Could not switch the model.");
    }
  }

  async function toggleAuto(v: boolean) {
    if (!sessionId) return;
    try {
      const res = await chatService.setAutoSwitch(sessionId, v);
      setActive(res.session);
    } catch {
      /* keep the current toggle */
    }
  }

  async function deleteSession() {
    if (!sessionId) return;
    try {
      await chatService.archive(sessionId);
    } catch {
      /* ignore */
    }
    setConfirmDelete(false);
    router.push("/chat");
    void refreshSessions();
  }

  async function runImprove() {
    const text = draft.trim();
    if (text.length < 10 || improveBusy) return;
    setImproveBusy(true);
    setImproveError(null);
    setImproveOpen(true);
    setImproveResult(null);
    try {
      const res = await improveService.improve({ content: text, sessionId });
      setImproveResult(res);
    } catch (err) {
      const message = /key/i.test(err instanceof Error ? err.message : "")
        ? "No usable API key yet — add one for any supported provider to use Improve."
        : err instanceof Error
          ? err.message
          : "Could not improve the prompt.";
      setImproveError(message);
    } finally {
      setImproveBusy(false);
    }
  }

  function useImprovedPrompt(prompt: string) {
    setDraft(prompt);
    setImproveOpen(false);
    setImproveResult(null);
  }

  async function saveMemory() {
    if (!lastReply || saveBusy || streaming) return;
    setSaveBusy(true);
    try {
      await memoryService.create({
        title: lastReply.userText.slice(0, 48),
        body: lastReply.text,
        sourceType: "session",
        sourceId: sessionId,
      });
      setToast("Saved to memory — find it under Learnings.");
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Could not save to memory.");
    } finally {
      setSaveBusy(false);
    }
  }

  async function runImprovedPrompt(prompt: string) {
    setDraft(prompt);
    setImproveOpen(false);
    setImproveResult(null);
    if (sessionId && active) await sendMessage(prompt);
  }

  async function sendMessage(override?: string) {
    if (!sessionId || !active) return;
    const text = (override ?? draft).trim();
    if (!text || streaming) return;

    const uiUser: UiMessage = {
      id: `local-user-${Date.now()}`,
      role: "user",
      content: text,
      createdAt: Date.now(),
    };
    const placeholderId = `local-ai-${Date.now()}`;
    const uiPlaceholder: UiMessage = {
      id: placeholderId,
      role: "assistant",
      content: "",
      streaming: true,
      createdAt: Date.now(),
    };

    setDraft("");
    setMessages((prev) => [...prev.filter((m) => m.id !== placeholderId), uiUser, uiPlaceholder]);
    setStream({ placeholderId, content: "" });
    contentRef.current = "";
    nearBottomRef.current = true;

    const controller = new AbortController();
    streamAbortRef.current = controller;

    let switchedFrom: UiMessage["switchedFrom"] | null = null;

    const applyDelta = (delta: string) => {
      contentRef.current += delta;
      setStream((s) =>
        s && s.placeholderId === placeholderId ? { ...s, content: contentRef.current } : s,
      );
    };

    const onEvent = (event: ChatEvent) => {
      switch (event.type) {
        case "start":
          setStream((s) =>
            s && s.placeholderId === placeholderId
              ? { ...s, model: event.model, provider: event.provider }
              : s,
          );
          break;
        case "delta":
          applyDelta(event.text);
          break;
        case "switched":
          switchedFrom = {
            fromModel: event.fromModel,
            toModel: event.toModel,
            reason: event.reason,
          };
          break;
        case "done": {
          const done = toUi(event.message);
          setLastReply({ userText: text, text: event.message.content });
          setMessages((prev) => [
            ...prev.filter((m) => m.id !== placeholderId),
            { ...done, switchedFrom: switchedFrom ?? done.switchedFrom },
          ]);
          if (switchedFrom) {
            setMessages((prev) =>
              prev.concat({
                id: `sys-${Date.now()}`,
                role: "system" as const,
                content: "",
                switchedFrom,
                createdAt: Date.now(),
              }),
            );
          }
          setStream(null);
          void refreshSessions();
          break;
        }
        case "error": {
          const partial = contentRef.current;
          const errored: UiMessage = {
            id: placeholderId,
            role: "assistant",
            content: partial,
            error: event.message,
            streaming: false,
            createdAt: Date.now(),
            switchedFrom: switchedFrom ?? undefined,
          };
          setMessages((prev) => [
            ...prev.filter((m) => m.id !== placeholderId),
            ...(partial.length > 0 ? [] : [errored]),
          ]);
          if (partial.length > 0) {
            setMessages((prev) => [...prev, errored]);
          }
          setStream(null);
          break;
        }
      }
    };

    try {
      await streamChatMessage({
        sessionId,
        content: text,
        model: active.defaultModel ?? undefined,
        autoSwitch,
        signal: controller.signal,
        onEvent,
      });
    } catch (err) {
      // An intentional abort (model switched mid-stream) is a clean reset —
      // the temporary draft is already gone; do not surface it as an error.
      if (err instanceof DOMException && err.name === "AbortError") {
        setStream(null);
        return;
      }
      const hasContent = contentRef.current.length > 0;
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== placeholderId),
        ...(hasContent ? [] : [
          {
            id: placeholderId,
            role: "assistant" as const,
            content: contentRef.current,
            error: err instanceof Error ? err.message : "Could not reach the chat server.",
            createdAt: Date.now(),
            switchedFrom: switchedFrom ?? undefined,
          },
        ]),
      ]);
      setStream(null);
    } finally {
      setStream(null);
      void refreshSessions();
    }
  }

  return (
    <div className={cn("flex overflow-hidden", SESSION_HEIGHT)}>
      {/* Sessions rail */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface/60 lg:flex">
        <div className="p-3">
          <Button
            size="sm"
            className="w-full"
            onClick={newSession}
            icon={busy === "new" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          >
            New chat
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          {sessions.length === 0 ? (
            <p className="px-2.5 py-3 text-[11.5px] leading-relaxed text-faint">
              No chats yet. Start with a prompt, or import a rescued conversation.
            </p>
          ) : (
            <div className="space-y-0.5">
              {sessions.map((s) => (
                <SessionItem key={s.id} session={s} active={s.id === sessionId} onClick={() => openSession(s.id)} />
              ))}
            </div>
          )}
        </div>
        <div className="space-y-1.5 border-t border-border p-3">
          <Button
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={() => setRescueOpen(true)}
            icon={<LifeBuoy className="h-3.5 w-3.5" />}
          >
            Rescue a past chat
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={importRescue}
            icon={busy === "rescue" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ClipboardPaste className="h-3.5 w-3.5" />}
          >
            Import last rescue
          </Button>
        </div>
      </aside>

      {/* Thread */}
      <section className="flex min-w-0 flex-1 flex-col bg-bg">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted" />
          </div>
        ) : !sessionId || !active ? (
          <Hero onRescueImport={importRescue} onNewChat={newSession} onOpenRescue={() => setRescueOpen(true)} busy={busy} />
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-border px-4 py-2.5 md:px-6">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="truncate text-sm font-semibold text-ink">{active.title}</h1>
                  {active.source === "rescue" ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-2 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-muted">
                      <LifeBuoy className="h-3 w-3" /> Rescue import
                    </span>
                  ) : null}
                </div>
                <p className="text-[10.5px] text-faint">
                  {active.messageCount} messages
                  {active.cost ? ` · ~${formatMoney(active.cost)}` : ""}
                </p>
              </div>
              <div className="flex-1" />
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-3 text-[11px] font-medium text-ink transition-colors hover:bg-surface-2"
              >
                {PICKER_MODELS.find((m) => m.id === (currentModel ?? "auto"))?.label}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                aria-label="Delete chat"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-faint transition-colors hover:bg-surface-2 hover:text-rose-400"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              onScroll={onScroll}
              className="min-h-0 flex-1 overflow-y-auto"
            >
              <div className="mx-auto w-full max-w-3xl space-y-5 px-4 py-6 md:px-6">
                {messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center">
                    <p className="max-w-xs py-20 text-center text-xs leading-relaxed text-faint">
                      This thread is brand new — type the first question and pick a model.
                    </p>
                  </div>
                ) : (
                  messages.map((m) => (
                    <MessageBubble
                      key={m.id}
                      message={m.id === stream?.placeholderId ? { ...m, content: stream.content } : m}
                    />
                  ))
                )}
                {streaming ? <TypingIndicator /> : null}
              </div>
            </div>

            {/* Composer */}
            <div className="mx-auto w-full max-w-3xl px-4 pb-4 md:px-6">
              <Composer
                value={draft}
                onChange={setDraft}
                onSend={() => sendMessage()}
                onOpenModel={() => setPickerOpen(true)}
                onImprove={() => runImprove()}
                onSaveMemory={() => void saveMemory()}
                currentModel={currentModel}
                disabled={streaming}
                improveBusy={improveBusy}
                saveBusy={saveBusy}
                autoSwitch={autoSwitch}
                onToggleAutoSwitch={(v) => toggleAuto(v)}
              />
            </div>
          </>
        )}
      </section>

      <ModelPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        health={health}
        current={currentModel}
        onSelect={(m) => chooseModel(m)}
      />

      <ImprovePanel
        open={improveOpen}
        original={draft}
        result={improveResult}
        busy={improveBusy}
        error={improveError}
        onClose={() => {
          if (!improveBusy) {
            setImproveOpen(false);
            setImproveResult(null);
          }
        }}
        onUse={useImprovedPrompt}
        onRun={runImprovedPrompt}
        onRetry={() => runImprove()}
      />

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete this chat?">
        <p className="text-sm text-muted">
          This removes the session and its messages from your workspace. This can&apos;t be undone.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" onClick={deleteSession}>
            Delete
          </Button>
        </div>
      </Modal>

      <RescueDialog
        open={rescueOpen}
        onClose={() => {
          setRescueOpen(false);
          void refreshSessions();
        }}
        onStarted={refreshSessions}
      />

      {toast ? (
        <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full border border-border bg-surface px-4 py-2 text-xs text-ink shadow-xl">
          {toast}
          <button type="button" className="ml-3 text-faint" onClick={() => setToast(null)}>
            ✕
          </button>
        </div>
      ) : null}
    </div>
  );
}