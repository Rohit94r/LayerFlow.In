import type { ReactNode } from "react";

interface DashboardCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: ReactNode;
  href?: string;
}

export default function DashboardCard({
  label,
  value,
  subtext,
  icon,
}: DashboardCardProps) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-muted">{label}</p>
        {icon && <span className="text-faint">{icon}</span>}
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-ink">
        {value}
      </p>
      {subtext && <p className="mt-0.5 text-xs text-faint">{subtext}</p>}
    </div>
  );
}
