"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  LifeBuoy,
  Wand2,
  BookUser,
  Library,
  FolderKanban,
  ArrowRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ACTIONS: { href: string; label: string; description: string; icon: LucideIcon; accent: string }[] = [
  {
    href: "/rescue",
    label: "Rescue a chat",
    description: "Paste any conversation, get a report",
    icon: LifeBuoy,
    accent: "#f59e0b",
  },
  {
    href: "/rescue?mode=prompt",
    label: "Improve a prompt",
    description: "Score & sharpen any prompt",
    icon: Wand2,
    accent: "#44edbc",
  },
  {
    href: "/passports",
    label: "New passport",
    description: "Start from scratch, save context",
    icon: BookUser,
    accent: "#8b7cf8",
  },
  {
    href: "/prompts",
    label: "Browse prompts",
    description: "Your scored prompt library",
    icon: Library,
    accent: "#38bdf8",
  },
  {
    href: "/workspace",
    label: "Open project",
    description: "Projects, timeline & learnings",
    icon: FolderKanban,
    accent: "#f472b6",
  },
];

export function QuickActions() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {ACTIONS.map((a, i) => (
        <motion.div
          key={a.href}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 + i * 0.06 }}
        >
          <Link
            href={a.href}
            className="card card-hover group flex h-full flex-col p-4"
          >
            <span
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ background: `${a.accent}1f`, color: a.accent }}
            >
              <a.icon className="h-4 w-4" />
            </span>
            <p className="mt-3 text-[13px] font-semibold text-ink">{a.label}</p>
            <p className="mt-0.5 text-[11px] leading-snug text-faint">{a.description}</p>
            <ArrowRight className="mt-auto ml-auto h-3.5 w-3.5 -translate-x-1 text-faint opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:text-ink group-hover:opacity-100" />
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
