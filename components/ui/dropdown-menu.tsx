"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface DropdownItem {
  id: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  destructive?: boolean;
  onSelect: () => void;
}

/**
 * Lightweight dropdown menu. Closes on outside click, Escape,
 * and item selection. Renders inline — place it in a relative
 * container and pass `align`.
 */
export function DropdownMenu({
  trigger,
  items,
  align = "end",
  className,
}: {
  trigger: (open: boolean) => ReactNode;
  items: DropdownItem[];
  align?: "start" | "end";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} className={cn("relative inline-block", className)}>
      <div onClick={() => setOpen((o) => !o)}>{trigger(open)}</div>
      <AnimatePresence>
        {open ? (
          <motion.div
            role="menu"
            className={cn(
              "absolute z-40 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-surface p-1 shadow-xl shadow-black/40",
              align === "end" ? "right-0" : "left-0",
            )}
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
          >
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors duration-100 hover:bg-surface-2",
                  item.destructive ? "text-crimson" : "text-ink",
                )}
              >
                {item.icon ? <span className="text-muted">{item.icon}</span> : null}
                <span className="min-w-0">
                  <span className="block truncate font-medium">{item.label}</span>
                  {item.description ? <span className="block truncate text-[11px] text-faint">{item.description}</span> : null}
                </span>
              </button>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
