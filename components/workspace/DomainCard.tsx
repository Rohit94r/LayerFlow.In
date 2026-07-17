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
  ArrowUpRight,
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
      className="card card-hover group flex flex-col p-5"
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-2">
          <Icon className="h-4 w-4 text-muted" />
        </div>
        <ArrowUpRight className="h-4 w-4 text-faint transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink" />
      </div>

      <h3 className="text-base font-semibold text-ink">{domain.name}</h3>
      <p className="mt-1 flex-1 text-sm leading-relaxed text-muted">
        {domain.description}
      </p>

      <div className="mt-4 flex items-center gap-3 border-t border-border pt-4 text-xs text-faint">
        <span>{domain.projectCount} projects</span>
        <span className="text-border-strong">·</span>
        <span>{domain.promptCount} prompts</span>
      </div>
    </Link>
  );
}
