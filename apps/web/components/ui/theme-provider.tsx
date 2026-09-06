"use client";

import { useEffect } from "react";
import { applyTheme, readStoredTheme, resolveInitialTheme, THEME_EVENT } from "@/lib/theme";

/**
 * Client-side theme provider. Reads the persisted theme on mount,
 * applies it to <html>, and listens for theme-toggle events emitted
 * by the command palette or keyboard shortcuts so all children stay
 * in sync without prop drilling.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    applyTheme(resolveInitialTheme());

    const onToggle = () => applyTheme(resolveInitialTheme());
    window.addEventListener(THEME_EVENT, onToggle);
    return () => window.removeEventListener(THEME_EVENT, onToggle);
  }, []);

  return <>{children}</>;
}