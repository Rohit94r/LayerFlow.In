"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "@/components/ui/icons";
import { Kbd } from "@/components/ui/kbd";
import { COMMANDS } from "@/lib/config/commands";
import type { CommandItem } from "@/lib/config/commands";
import { cn } from "@/lib/utils";

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onAction?: (item: CommandItem) => void;
}

/** Command palette (Cmd+K). Filters the command registry, navigates, or fires an action. */
export function CommandPalette({ open, onClose, onAction }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setQuery("");
      setIndex(0);
    }
  }

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COMMANDS;
    return COMMANDS.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        (c.hint ?? "").toLowerCase().includes(q) ||
        (c.keywords ?? []).some((k) => k.includes(q)),
    );
  }, [query]);

  const safeIndex = results.length ? Math.min(index, results.length - 1) : 0;

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${safeIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [safeIndex]);

  const select = (item: CommandItem) => {
    if (item.action) {
      onAction?.(item);
      onClose();
      return;
    }
    if (item.href) {
      router.push(item.href);
      onClose();
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[safeIndex]) {
      e.preventDefault();
      select(results[safeIndex]);
    }
  };

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[15vh]" role="dialog" aria-modal="true" aria-label="Command palette">
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
          />
          <motion.div
            className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl shadow-black/50"
            initial={{ opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center gap-3 border-b border-border px-4">
              <Search className="h-4 w-4 shrink-0 text-faint" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search pages and actions…"
                aria-label="Search commands"
                autoFocus
                className="h-12 w-full bg-transparent text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-brand placeholder:text-faint"
              />
              <Kbd>esc</Kbd>
            </div>
            <div ref={listRef} className="max-h-[40vh] overflow-y-auto p-2">
              {results.length === 0 ? (
                <p className="px-3 py-8 text-center text-xs text-faint">
                  No results for “{query}”
                </p>
              ) : (
                results.map((item, i) => (
                  <button
                    key={item.id}
                    type="button"
                    data-index={i}
                    onClick={() => select(item)}
                    onMouseEnter={() => setIndex(i)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] transition-colors duration-75",
                      i === index ? "bg-surface-2 text-ink" : "text-muted",
                    )}
                  >
                    <span className="min-w-0">
                      <span className={cn("block truncate font-medium", i === index ? "text-ink" : "text-muted")}>
                        {item.label}
                      </span>
                      {item.hint ? <span className="block truncate text-[11px] text-faint">{item.hint}</span> : null}
                    </span>
                    <span className="shrink-0 font-mono text-[10px] text-faint">{item.href ?? "action"}</span>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
