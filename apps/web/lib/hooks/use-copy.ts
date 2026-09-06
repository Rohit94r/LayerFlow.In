"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface CopyState {
  copied: boolean;
  copy: (text: string) => Promise<void>;
  reset: () => void;
}

/** Clipboard copy with a temporary "copied" indicator (1.8s). */
export function useCopy(timeoutMs = 1800): CopyState {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const reset = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setCopied(false);
  }, []);

  const copy = useCallback(
    async (text: string) => {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), timeoutMs);
    },
    [timeoutMs],
  );

  return { copied, copy, reset };
}
