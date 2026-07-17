"use client";

import ThemeToggle from "@/components/marketing/ThemeToggle";

export default function AppTopBar() {
  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between border-b border-border bg-bg/90 px-6 backdrop-blur-xl">
      <p className="text-sm text-muted">
        The workspace for everything you do with AI
      </p>
      <div className="flex items-center gap-2">
        <ThemeToggle />
      </div>
    </header>
  );
}
