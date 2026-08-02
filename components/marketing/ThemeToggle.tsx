"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "@/components/ui/icons";
import { motion, AnimatePresence } from "framer-motion";
import {
  applyTheme,
  persistTheme,
  resolveInitialTheme,
  type Theme,
} from "@/lib/theme";

export type { Theme };

export type ThemeToggleProps = {
  /** When true, styles for sitting over the marketing hero gradient */
  overHero?: boolean;
};

export function ThemeToggle({ overHero = false }: ThemeToggleProps) {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Theme is applied post-mount (document unavailable on the server);
    // the bootstrap script in the layout has already set the correct class.
    const initial = resolveInitialTheme();
    applyTheme(initial);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(initial);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    persistTheme(next);
  };

  return (
    <button
      onClick={toggle}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
        overHero
          ? "border border-white/15 bg-black/20 text-white hover:bg-black/30"
          : "glass-pill text-ink hover:border-border-strong"
      }`}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={mounted ? theme : "init"}
          initial={{ rotate: -90, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          exit={{ rotate: 90, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {theme === "dark" ? (
            <Moon className="h-4 w-4" />
          ) : (
            <Sun className="h-4 w-4" />
          )}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

export default ThemeToggle;
