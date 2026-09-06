import { AlertTriangle, Loader2, Refresh } from "@/components/ui/icons";
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

function ModelLabel({ message }: { message: UiMessage }) {
  if (!message.provider) return null;
  return (
    <p className="mb-1.5 flex items-center gap-2 text-[10.5px] font-medium text-faint">
      <span>{providerLabel(message.provider)}</span>
      {message.model && message.model !== "auto" ? <span>· {message.model}</span> : null}
      {typeof message.cost === "number" && message.cost > 0 ? (
        <span>· {formatMoney(message.cost)}</span>
      ) : null}
    </p>
  );
}

export function MessageBubble({ message }: { message: UiMessage }) {
  if (message.role === "system") {
    if (message.switchedFrom) {
      return (
        <div className="my-3 flex flex-col items-center gap-1 text-center">
          <div className="flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5 text-[11px] text-muted">
            <Loader2 className="h-3 w-3 animate-spin" />
            {message.switchedFrom.toModel} is now answering this conversation
          </div>
          {message.content ? <p className="px-4 text-[10.5px] text-faint">{message.content}</p> : null}
        </div>
      );
    }
    return (
      <div className="my-2 flex items-center gap-2 text-[11px] text-faint">
        <Refresh className="h-3 w-3" />
        <span>{message.content}</span>
      </div>
    );
  }

  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[82%] rounded-2xl rounded-br-md bg-surface-2 px-4 py-2.5 text-sm leading-relaxed text-ink">
          {renderMessage(message.content, "")}
        </div>
      </div>
    );
  }

  const failed = Boolean(message.error);
  return (
    <div className="flex flex-col">
      <ModelLabel message={message} />
      <div
        className={cn(
          "max-w-full text-sm leading-relaxed text-ink/90",
          failed ? "rounded-2xl border border-rose-500/25 bg-rose-500/[0.05] px-4 py-2.5" : "px-0.5",
        )}
      >
        {failed ? (
          <div className="space-y-1.5">
            {message.content.length > 0 ? <div>{renderMessage(message.content)}</div> : null}
            <div className="flex items-start gap-2 text-[13px] text-rose-400">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{message.error}</span>
            </div>
          </div>
        ) : (
          <div>
            {renderMessage(message.content)}
            {message.streaming ? (
              <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse rounded-sm bg-ink align-middle" />
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 text-sm text-faint">
      <Loader2 className="h-3.5 w-3.5 animate-spin" />
      <span>Thinking…</span>
    </div>
  );
}
