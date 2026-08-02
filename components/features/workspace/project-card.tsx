import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { timeAgo } from "@/lib/data/providers";
import type { Project } from "@/lib/types";

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      href={`/workspace/${project.id}`}
      className="group flex h-full flex-col rounded-2xl border border-border bg-surface/40 p-5 transition-colors duration-150 hover:border-border-strong hover:bg-surface-2/50"
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className="flex h-10 w-10 items-center justify-center rounded-xl text-[15px] font-bold"
          style={{ background: `${project.color}22`, color: project.color }}
        >
          {project.name.charAt(0)}
        </span>
        <Badge
          tone={project.stage === "active" ? "mint" : project.stage === "paused" ? "amber" : "neutral"}
        >
          {project.stage}
        </Badge>
      </div>
      <h3 className="mt-4 text-sm font-semibold text-ink transition-colors duration-150 group-hover:text-brand">
        {project.name}
      </h3>
      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">{project.description}</p>
      <div className="mt-4 flex items-center gap-3 border-t border-border pt-3 text-[11px] text-faint">
        <span>{project.passportCount} passports</span>
        <span>·</span>
        <span>{project.promptCount} prompts</span>
        <span className="ml-auto">updated {timeAgo(project.updatedAt)}</span>
      </div>
    </Link>
  );
}
