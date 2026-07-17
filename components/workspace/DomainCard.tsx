import Link from "next/link";
import {
  Code2,
  Megaphone,
  GraduationCap,
  Briefcase,
  Microscope,
  FileText,
  Users,
  BookOpen,
  Sparkles,
  FolderKanban,
  FileStack,
} from "lucide-react";
import type { Domain } from "@/lib/types";

import type { LucideIcon } from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  Code2,
  Megaphone,
  GraduationCap,
  Briefcase,
  Microscope,
  FileText,
  Users,
  BookOpen,
  Sparkles,
};

interface DomainCardProps {
  domain: Domain;
}

export default function DomainCard({ domain }: DomainCardProps) {
  const Icon = iconMap[domain.icon] ?? Sparkles;

  return (
    <Link
      href={`/projects?domain=${domain.id}`}
      className="card card-hover group flex flex-col p-5 transition-all"
    >
      <div className="mb-4 flex items-start justify-between">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${domain.color}18` }}
        >
          <Icon className="h-5 w-5" style={{ color: domain.color }} />
        </div>
        <span
          className="h-2 w-2 rounded-full opacity-60 transition-opacity group-hover:opacity-100"
          style={{ backgroundColor: domain.color }}
        />
      </div>

      <h3 className="mb-1 text-base font-semibold text-[var(--color-ink)]">
        {domain.name}
      </h3>
      <p className="mb-4 flex-1 text-sm leading-relaxed text-[var(--color-muted)]">
        {domain.description}
      </p>

      <div className="flex items-center gap-4 text-xs text-[var(--color-faint)]">
        <span className="flex items-center gap-1.5">
          <FolderKanban className="h-3.5 w-3.5" />
          {domain.projectCount} projects
        </span>
        <span className="flex items-center gap-1.5">
          <FileStack className="h-3.5 w-3.5" />
          {domain.promptCount} prompts
        </span>
      </div>
    </Link>
  );
}
