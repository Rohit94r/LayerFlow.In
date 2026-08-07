import { AlertTriangle, CheckCircle2, Loader2, Refresh } from "@/components/ui/icons";
import { formatMoney } from "@/lib/data/providers";
import { cn } from "@/lib/utils";
import { providerLabel } from "./chat-models";
import { renderMessage } from "./simple-md";

export interface UiMessage {
  id: string;
  role: "system" | "user" | "assistant";
  content: string;
  model?: string | null;
  provider?: string | null;
  keyHint?: string | null;
  cost?: number;
  createdAt?: number;
  streaming?: boolean;
  error?: string | null;
  switchedFrom?: { fromModel: string; toModel: string; reason: string } | null;
}

const PROVIDER_COLORS: Record<string, string> = {
  openai: "#10a37f",
  anthropic: "#d97757",
  google: "#8b7cf8",
  deepseek: "#4d6bfe",
  groq: "#f55036",
  xai: "#22c55e",
  kimi: "#f7c948",
  openrouter: "#8b5cf6",
};

/** Fall back to the attempted model name when the provider color is unknown. */
function ProviderBadge({ provider, model }: { provider?: string | null; model?: string | null }) {
  if (!provider) return null;
  const color = PROVIDER_COLORS[provider] ?? "#9ca3ab";
  const name = providerLabel(provider);
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-faint">
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {name}
      {model && model !== "auto" ? (
        <span className="normal-case tracking-normal text-faint/80">· {model}</span>
      ) : null}
    </span>
  );
}

function AssistantAvatar({ provider }: { provider?: string | null }) {
  const color = PROVIDER_COLORS[provider ?? ""] ?? "url(#grad)";
  return (
    <span
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white"
      style={{ backgroundColor: color, backgroundImage: provider ? undefined : "linear-gradient(135deg,#fbbf24,#34d399)" }}
      aria-hidden
    >
      {provider ? providerLabel(provider).charAt(0).toUpperCase() : "LF"}
    </span>
  );
}

export function MessageBubble({ message }: { message: UiMessage }) {
  if (message.role === "system") {
    if (message.switchedFrom) {
      return (
        <div className="mx-auto my-3 flex max-w-xl flex-col items-center gap-1 text-center">
          <div className="flex items-center gap-2 rounded-full border border-brand/20 bg-brand/5 px-4 py-2 text-[11.5px] text-brand">
            <Loader2 className="h-3 w-3" />
            {message.switchedFrom.toModel} is now answering this conversation
          </div>
          <p className="px-4 text-[10.5px] text-faint">
            {message.content}
          </p>
        </div>
      );
    }
    return (
      <div className="my-2 flex items-center gap-2 text-[11px] text-faint">
        <span className="inline-flex items-center gap-1.5">
          <Refresh className="h-3 w-3" /> {message.content}
        </span>
      </div>
    );
  }

  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[82%] rounded-2xl rounded-br-md border border-brand/20 bg-brand/[0.06] px-4 py-2.5 text-sm text-ink/90">
          {renderMessage(message.content, "")}
        </div>
      </div>
    );
  }

  // Assistant / streaming / error
  const failed = Boolean(message.error);
  return (
    <div className="flex items-start gap-3">
      <AssistantAvatar provider={message.provider} />
      <div className="min-w-0 flex-1">
        {message.provider ? (
          <div className="mb-1 flex items-center gap-2">
            <ProviderBadge provider={message.provider} model={message.model} />
            <span className="flex-1" />
            {typeof message.cost === "number" && message.cost > 0 ? (
              <span className="text-[10.5px] font-medium text-faint">{formatMoney(message.cost)}</span>
            ) : null}
          </div>
        ) : null}
        <div
          className={cn(
            "max-w-full rounded-2xl rounded-tl-md px-4 py-2.5 text-sm text-ink/90",
            failed ? "border border-rose-500/30 bg-rose-500/[0.06]" : "bg-surface-2/70",
          )}
        >
          {failed ? (
            <div className="flex items-start gap-2 text-[13px] text-rose-400">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{message.error}</span>
            </div>
          ) : (
            <div>
              {renderMessage(message.content)}
              {message.streaming ? (
                <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse rounded-sm bg-brand align-middle" />
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex items-start gap-3">
      <AssistantAvatar />
      <div className="flex items-center gap-2 rounded-2xl rounded-tl-md bg-surface-2/70 px-4 py-3">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted" />
        <span className="text-xs text-muted">Thinking…</span>
      </div>
    </div>
  );
}