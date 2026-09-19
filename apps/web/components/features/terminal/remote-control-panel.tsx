"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CircleDashed,
  Clock,
  Loader2,
  Send,
  TerminalSquare,
} from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, Input } from "@/components/ui/input";
import type { DeviceCommand } from "@/lib/services/terminal";
import { terminalService } from "@/lib/services/terminal";
import type { SyncOperation } from "@/lib/services/sync";
import { syncService } from "@/lib/services/sync";
import { timeAgo } from "@/lib/data/providers";
import { cn } from "@/lib/utils";

const STATUS_META: Record<
  DeviceCommand["status"],
  { label: string; tone: "neutral" | "amber" | "mint" | "rose" | "red"; spin?: boolean }
> = {
  pending: { label: "Queued", tone: "neutral" },
  running: { label: "Running", tone: "amber", spin: true },
  succeeded: { label: "Done", tone: "mint" },
  failed: { label: "Failed", tone: "rose" },
  cancelled: { label: "Cancelled", tone: "red" },
};

const isActive = (status: DeviceCommand["status"]) => status === "pending" || status === "running";

export function RemoteControlPanel() {
  const [commands, setCommands] = useState<DeviceCommand[]>([]);
  const [devices, setDevices] = useState<SyncOperation[]>([]);
  const [command, setCommand] = useState("");
  const [deviceId, setDeviceId] = useState("any");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const outputRef = useRef<HTMLPreElement>(null);

  const deviceIds = Array.from(new Set(devices.map((d) => d.device_id).filter(Boolean)));

  const load = useCallback(async () => {
    try {
      const [res, ops] = await Promise.allSettled([
        terminalService.listCommands({ limit: 25 }),
        syncService.operations({ limit: 100 }),
      ]);
      if (res.status === "fulfilled") setCommands(res.value.commands);
      if (ops.status === "fulfilled") setDevices(ops.value.operations);
    } catch {
      setError("Could not load remote commands.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    void (async () => {
      try {
        const [res, ops] = await Promise.allSettled([
          terminalService.listCommands({ limit: 25 }),
          syncService.operations({ limit: 100 }),
        ]);
        if (ignore) return;
        if (res.status === "fulfilled") setCommands(res.value.commands);
        if (ops.status === "fulfilled") setDevices(ops.value.operations);
      } catch {
        if (!ignore) setError("Could not load remote commands.");
      } finally {
        if (!ignore) setLoading(false);
      }
    })();

    const t = setInterval(() => void load(), 3000);
    return () => {
      ignore = true;
      clearInterval(t);
    };
  }, [load]);

  useEffect(() => {
    if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
  }, [commands]);

  async function send() {
    const trimmed = command.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setError(null);
    try {
      await terminalService.createCommand({
        command: trimmed,
        device_id: deviceId === "any" ? null : deviceId,
      });
      setCommand("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the command.");
    } finally {
      setSending(false);
    }
  }

  async function cancel(id: string) {
    try {
      await terminalService.cancelCommand(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not cancel the command.");
    }
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold tracking-tight text-ink">Remote control</h2>
        <p className="text-xs text-muted">
          Drive a connected <span className="font-mono">lf</span> CLI like a car — queues a shell command, the daemon
          claims it, runs it on that machine, and streams the output back here.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-surface shadow-sm">
        <div className="grid gap-3 p-4 sm:grid-cols-[1fr_200px_auto] md:p-5">
          <Field label="Command">
            <Input
              aria-label="Shell command"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void send();
              }}
              placeholder="e.g. git status && npm run typecheck"
              className="font-mono"
            />
          </Field>
          <Field label="Target device">
            <select
              className="workspace-input"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              aria-label="Target device"
            >
              <option value="any">Any available device</option>
              {deviceIds.map((id) => (
                <option key={id} value={id}>
                  {id.slice(0, 8)}
                </option>
              ))}
            </select>
          </Field>
          <div className="flex items-end">
            <Button
              onClick={() => void send()}
              disabled={!command.trim() || sending}
              icon={sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            >
              Send
            </Button>
          </div>
        </div>

        {error ? (
          <p className="mx-5 mb-3 flex items-center gap-1.5 text-[11px] text-rose-400">
            <AlertTriangle className="h-3 w-3" /> {error}
          </p>
        ) : null}
        {deviceIds.length === 0 && !loading ? (
          <p className="mx-5 mb-4 rounded-xl border border-dashed border-border bg-surface-2/50 p-3 text-[11px] leading-5 text-muted">
            No devices synced yet. Install and log in the <span className="font-mono">lf</span> CLI on a machine, then run{" "}
            <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-brand">lf daemon start</span> to be able to run
            these commands.
          </p>
        ) : null}

        <div className="divide-y divide-border border-t border-border">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-faint" />
            </div>
          ) : commands.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <TerminalSquare className="mx-auto h-6 w-6 text-faint" />
              <p className="mt-2 text-sm font-medium text-ink">No commands yet</p>
              <p className="mt-1 text-xs text-muted">Send a command above — it will run on the first available CLI.</p>
            </div>
          ) : (
            commands.map((c) => {
              const meta = STATUS_META[c.status];
              return (
                <div key={c.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-mono text-[13px] font-semibold text-ink">{c.command}</p>
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                    {c.device_id ? (
                      <span className="rounded-full bg-surface-2 px-2 py-0.5 font-mono text-[10px] text-faint">
                        {c.device_id.slice(0, 8)}
                      </span>
                    ) : null}
                    <span className="ml-auto shrink-0 text-[10px] text-faint">{timeAgo(c.created_at)}</span>
                  </div>

                  {(c.output || c.error_message) && c.status !== "pending" ? (
                    <pre
                      ref={outputRef}
                      className={cn(
                        "mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-xl border border-border bg-bg/80 p-3 font-mono text-[11px] leading-5",
                        c.status === "failed" || c.status === "cancelled" ? "text-rose-300/90" : "text-ink/80",
                      )}
                    >
                      {c.output}
                      {c.error_message ? `\n${c.error_message}` : ""}
                    </pre>
                  ) : null}

                  <div className="mt-2 flex items-center gap-3">
                    {meta.spin ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400">
                        <Loader2 className="h-3 w-3 animate-spin" /> running on {c.device_id?.slice(0, 8) ?? "a device"}
                      </span>
                    ) : c.exit_code != null ? (
                      <span className="text-[10px] text-faint">
                        exit {c.exit_code}
                        {c.completed_at ? ` · ${timeAgo(c.completed_at)}` : ""}
                      </span>
                    ) : null}
                    {c.status === "pending" ? (
                      <button
                        type="button"
                        onClick={() => void cancel(c.id)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted transition hover:text-rose-400"
                      >
                        <CircleDashed className="h-3 w-3" /> Cancel
                      </button>
                    ) : null}
                  </div>

                  {isActive(c.status) ? (
                    <div className="mt-2 flex items-center gap-1.5 text-[10px] text-faint">
                      <Clock className="h-3 w-3" /> live — updates every few seconds
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}