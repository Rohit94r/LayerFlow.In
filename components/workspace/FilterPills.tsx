"use client";

import Link from "next/link";

interface FilterPill {
  label: string;
  href?: string;
  active?: boolean;
  onClick?: () => void;
}

interface FilterPillsProps {
  items: FilterPill[];
}

export default function FilterPills({ items }: FilterPillsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => {
        const className = `filter-pill ${item.active ? "filter-pill-active" : ""}`;

        if (item.onClick) {
          return (
            <button
              key={item.label}
              type="button"
              onClick={item.onClick}
              className={className}
            >
              {item.label}
            </button>
          );
        }

        if (item.href) {
          return (
            <Link key={item.label} href={item.href} className={className}>
              {item.label}
            </Link>
          );
        }

        return (
          <button key={item.label} type="button" className={className}>
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
