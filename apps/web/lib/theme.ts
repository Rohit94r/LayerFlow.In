export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "lf-theme";

/** Apply theme to <html>. Light = class "light"; dark = no light class. */
export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("light", theme === "light");
}

export function readStoredTheme(): Theme | null {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // ignore
  }
  return null;
}

export function resolveInitialTheme(): Theme {
  const stored = readStoredTheme();
  if (stored) return stored;
  if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

export function persistTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // ignore
  }
}

export const THEME_EVENT = "lf:theme-toggle";

/** Emitted so every mounted ThemeToggle stays in sync. */
export function emitThemeToggle(): void {
  window.dispatchEvent(new CustomEvent(THEME_EVENT));
}

/**
 * Inline bootstrap script — runs before paint.
 * Enforces dark mode always to match landing page.
 */
export const THEME_BOOTSTRAP_SCRIPT = `(function(){try{document.documentElement.classList.remove('light');localStorage.setItem('lf-theme', 'dark');}catch(e){}})();`;
