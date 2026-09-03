"use client";

import { useCallback, useEffect, useState } from "react";
import { applyTheme, persistTheme, readStoredTheme, resolveInitialTheme, emitThemeToggle } from "@/lib/theme";

export interface CommandMenuState {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

/**
 * Command menu (Cmd/Ctrl+K) open state. Listens for the global
 * keyboard shortcut and exposes an imperative setter for the
 * topbar button.
 */
export function useCommandMenu(): CommandMenuState {
  const [open, setOpen] = useState(false);

  const toggle = useCallback(() => setOpen((o) => !o), []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      // d → toggle dark mode
      if (e.key.toLowerCase() === "d" && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        const target = e.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
        e.preventDefault();
        const next = (readStoredTheme() ?? resolveInitialTheme()) === "light" ? "dark" : "light";
        persistTheme(next);
        applyTheme(next);
        emitThemeToggle();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return { open, setOpen, toggle };
}
