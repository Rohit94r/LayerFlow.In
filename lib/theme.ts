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

/**
 * Inline bootstrap script — runs before paint.
 * Saved light → light; saved dark → dark; no save → system preference.
 */
export const THEME_BOOTSTRAP_SCRIPT = `(function(){try{var k='lf-theme';var t=localStorage.getItem(k);var dark=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;var theme=t==='light'||t==='dark'?t:(dark?'dark':'light');if(theme==='light'){document.documentElement.classList.add('light');}else{document.documentElement.classList.remove('light');}}catch(e){document.documentElement.classList.add('light');}})();`;
