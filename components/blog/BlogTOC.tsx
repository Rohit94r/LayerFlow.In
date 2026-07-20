"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type TocItem = { id: string; text: string; level: 2 | 3 };

export default function BlogTOC({ items }: { items: TocItem[] }) {
  const [open, setOpen] = useState(false);
  const filtered = useMemo(
    () => items.filter((i) => i.level === 2 || i.level === 3),
    [items],
  );

  if (filtered.length < 3) return null;

  return (
    <nav
      aria-label="Table of contents"
      className="rounded-xl border border-border bg-surface/60 p-4 lg:sticky lg:top-28"
    >
      <button
        type="button"
        className="flex w-full items-center justify-between text-left text-sm font-semibold text-ink lg:cursor-default"
        onClick={() => setOpen((v) => !v)}
      >
        On this page
        <span className="font-mono text-xs text-faint lg:hidden">
          {open ? "−" : "+"}
        </span>
      </button>
      <ul
        className={`mt-3 space-y-2 ${open ? "block" : "hidden lg:block"}`}
      >
        {filtered.map((item) => (
          <li key={item.id} className={item.level === 3 ? "pl-3" : ""}>
            <Link
              href={`#${item.id}`}
              className="text-sm leading-snug text-muted transition-colors hover:text-brand"
            >
              {item.text}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
