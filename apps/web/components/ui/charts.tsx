"use client";

import { motion } from "framer-motion";
import type { CostPoint } from "@/lib/types";
import { cn } from "@/lib/utils";

const LINE = "#f59e0b";
const MINT = "#44edbc";

// ── Area chart ───────────────────────────────────────────────

export function AreaChart({
  data,
  height = 160,
  color = LINE,
  showGrid = true,
  className,
}: {
  data: CostPoint[];
  height?: number;
  color?: string;
  showGrid?: boolean;
  className?: string;
}) {
  const w = 560;
  const h = height;
  const pad = 8;
  const max = Math.max(...data.map((d) => d.value)) * 1.15 || 1;
  const min = Math.min(...data.map((d) => d.value)) * 0.8;

  const pts = data.map((d, i) => {
    const x = pad + (i * (w - pad * 2)) / (data.length - 1);
    const y = h - pad - ((d.value - min) / (max - min)) * (h - pad * 2);
    return { x, y, ...d };
  });

  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaPath = `${linePath} L${pts[pts.length - 1].x},${h - pad} L${pts[0].x},${h - pad} Z`;

  const id = `grad-${color.replace("#", "")}-${data.length}`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={cn("w-full", className)} role="img" aria-label="Area chart">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.32" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {showGrid
        ? [0.25, 0.5, 0.75].map((f) => (
            <line
              key={f}
              x1={pad}
              x2={w - pad}
              y1={h - f * (h - pad * 2)}
              y2={h - f * (h - pad * 2)}
              stroke="var(--color-border)"
              strokeDasharray="3 5"
            />
          ))
        : null}
      <motion.path
        d={areaPath}
        fill={`url(#${id})`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.3 }}
      />
      <motion.path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.1, ease: "easeOut" }}
      />
      {pts.map((p, i) => (
        <motion.circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={i === pts.length - 1 ? 4 : 2.5}
          fill={color}
          stroke="var(--color-surface)"
          strokeWidth="2"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 + i * 0.05 }}
        >
          <title>{`${p.label}: ${p.value}`}</title>
        </motion.circle>
      ))}
    </svg>
  );
}

// ── Bar chart ────────────────────────────────────────────────

export function BarChart({
  data,
  height = 160,
  color = LINE,
  highlightLast = true,
  className,
}: {
  data: CostPoint[];
  height?: number;
  color?: string;
  highlightLast?: boolean;
  className?: string;
}) {
  const max = Math.max(...data.map((d) => d.value)) || 1;
  return (
    <div className={cn("flex items-end gap-2", className)} style={{ height }}>
      {data.map((d, i) => {
        const isLast = i === data.length - 1;
        return (
          <div key={d.label} className="flex flex-1 flex-col items-center gap-1.5" style={{ height: "100%" }}>
            <motion.div
              className="w-full rounded-t-md"
              style={{
                background: isLast && highlightLast ? `linear-gradient(180deg, ${MINT}, ${color})` : color,
                opacity: isLast && highlightLast ? 1 : 0.45,
              }}
              initial={{ height: 0 }}
              animate={{ height: `${(d.value / max) * 100}%` }}
              transition={{ duration: 0.7, delay: i * 0.06, ease: "easeOut" }}
            >
              <title>{`${d.label}: ${d.value}`}</title>
            </motion.div>
            <span className="text-[10px] font-medium text-faint">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Donut chart ──────────────────────────────────────────────

export function DonutChart({
  data,
  size = 168,
  thickness = 22,
  className,
  centerLabel,
  centerValue,
}: {
  data: { label: string; value: number }[];
  size?: number;
  thickness?: number;
  className?: string;
  centerLabel?: string;
  centerValue?: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const colors = ["#f59e0b", "#44edbc", "#8b7cf8", "#38bdf8", "#f472b6"];

  const segments = data.reduce<
    { label: string; value: number; offset: number; dash: number }[]
  >((acc, d) => {
    const frac = d.value / total;
    const offset = acc.length > 0 ? acc[acc.length - 1].offset + acc[acc.length - 1].dash / c : 0;
    acc.push({ label: d.label, value: d.value, offset, dash: frac * c });
    return acc;
  }, []);

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-border)" strokeWidth={thickness} />
        {segments.map((d, i) => (
          <motion.circle
            key={d.label}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={colors[i % colors.length]}
            strokeWidth={thickness}
            strokeDasharray={`${d.dash} ${c - d.dash}`}
            strokeDashoffset={-d.offset * c}
            strokeLinecap="round"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 + i * 0.1 }}
          >
            <title>{`${d.label}: ${d.value}%`}</title>
          </motion.circle>
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-ink">{centerValue}</span>
        {centerLabel ? <span className="text-[10px] font-medium uppercase tracking-wide text-faint">{centerLabel}</span> : null}
      </div>
    </div>
  );
}

// ── Sparkline ────────────────────────────────────────────────

export function Sparkline({
  data,
  width = 96,
  height = 32,
  color = MINT,
  className,
}: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}) {
  const max = Math.max(...data) || 1;
  const min = Math.min(...data);
  const pts = data.map((v, i) => {
    const x = (i * width) / (data.length - 1);
    const y = height - 3 - ((v - min) / (max - min || 1)) * (height - 6);
    return `${x},${y}`;
  });
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden>
      <motion.polyline
        points={pts.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.9, ease: "easeOut" }}
      />
    </svg>
  );
}

// ── Radial score ─────────────────────────────────────────────

export function RadialScore({
  value,
  size = 72,
  label,
  className,
}: {
  value: number;
  size?: number;
  label?: string;
  className?: string;
}) {
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  const dash = (value / 100) * c;
  const color = value >= 85 ? "#44edbc" : value >= 70 ? "#f59e0b" : "#f472b6";
  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-border)" strokeWidth="7" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: 0 }}
          transition={{ duration: 1.1, ease: "easeOut", delay: 0.2 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold leading-none text-ink">{value}</span>
        {label ? <span className="mt-0.5 text-[9px] font-medium uppercase tracking-wide text-faint">{label}</span> : null}
      </div>
    </div>
  );
}

// ── Legend ───────────────────────────────────────────────────

export function ChartLegend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1.5 text-xs text-muted">
          <span className="h-2 w-2 rounded-full" style={{ background: it.color }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}
