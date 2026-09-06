export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-border bg-surface-2 px-1.5 font-mono text-[10px] font-medium text-muted">
      {children}
    </kbd>
  );
}
