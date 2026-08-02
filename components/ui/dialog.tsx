"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { X } from "@/components/ui/icons";
import { IconButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Modal dialog with focus management and Escape-to-close.
 * Renders inline (no portal) — mount it at the page root.
 */
export function Dialog({ open, onClose, title, description, children, className }: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previous?.focus();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
          />
          <motion.div
            ref={dialogRef}
            tabIndex={-1}
            className={cn(
              "relative w-full max-w-lg rounded-2xl border border-border bg-surface shadow-2xl shadow-black/50 outline-none",
              className,
            )}
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 12 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          >
            {(title || description) && (
              <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
                <div className="min-w-0">
                  {title ? <h2 className="text-sm font-semibold text-ink">{title}</h2> : null}
                  {description ? <p className="mt-0.5 text-xs text-muted">{description}</p> : null}
                </div>
                <IconButton label="Close dialog" onClick={onClose}>
                  <X className="h-4 w-4" />
                </IconButton>
              </div>
            )}
            <div className="max-h-[70vh] overflow-y-auto p-5">{children}</div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
