"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Toast = { id: string; message: string; type?: "info" | "error" };
let toastListeners: ((t: Toast) => void)[] = [];
let toastId = 0;

export function toast(message: string, type?: "info" | "error") {
  const id = `toast-${++toastId}`;
  toastListeners.forEach((fn) => fn({ id, message, type }));
}

/**
 * Minimal toast provider. Renders a shared toast container in the
 * root layout so any page can call `toast()` without managing its
 * own state.
 */
export function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);

  useEffect(() => {
    const listener = (t: Toast) => {
      setItems((prev) => [...prev, t]);
      setTimeout(() => {
        setItems((prev) => prev.filter((x) => x.id !== t.id));
      }, 3000);
    };
    toastListeners.push(listener);
    return () => {
      toastListeners = toastListeners.filter((fn) => fn !== listener);
    };
  }, []);

  return (
    <div
      className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 flex-col-reverse gap-2"
      aria-live="polite"
      aria-atomic="false"
    >
      {items.map((item) => (
        <div
          key={item.id}
          role="status"
          className={cn(
            "rounded-full border px-4 py-2 text-xs shadow-xl",
            item.type === "error"
              ? "border-rose-500/20 bg-rose-500/10 text-rose-400"
              : "border-border bg-surface text-ink",
          )}
        >
          {item.message}
        </div>
      ))}
    </div>
  );
}