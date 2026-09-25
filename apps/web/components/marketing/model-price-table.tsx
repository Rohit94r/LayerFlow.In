import { cn } from "@/lib/utils";
import {
  classForRow,
  formatContext,
  formatUsd,
  PROVIDER_BADGE_COLOR,
  type PriceRow,
} from "@/lib/data/model-comparison";

const CLASS_LABEL: Record<string, string> = {
  cheap: "Cheap",
  balanced: "Balanced",
  flagship: "Flagship",
};

const CLASS_DOT: Record<string, string> = {
  cheap: "bg-emerald-500",
  balanced: "bg-amber-500",
  flagship: "bg-rose-500",
};

interface Props {
  rows: PriceRow[];
  showClass?: boolean;
  markCheapest?: boolean;
  markBestContext?: boolean;
}

export function ModelPriceTable({ rows, showClass = true, markCheapest = false, markBestContext = false }: Props) {
  const cheapestId = markCheapest ? [...rows].sort((a, b) => a.inputUSD - b.inputUSD)[0]?.id : null;
  const bestContextId = markBestContext
    ? [...rows].sort((a, b) => b.contextWindow - a.contextWindow)[0]?.id
    : null;

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead>
          <tr className="border-b border-border text-xs uppercase tracking-wide text-faint">
            <th className="px-4 py-3 font-semibold">Model</th>
            <th className="px-4 py-3 font-semibold">Provider</th>
            <th className="px-4 py-3 text-right font-semibold">$ in / 1M</th>
            <th className="px-4 py-3 text-right font-semibold">$ out / 1M</th>
            <th className="px-4 py-3 text-right font-semibold">Context</th>
            {showClass ? <th className="px-4 py-3 font-semibold">Class</th> : null}
            <th className="px-4 py-3 font-semibold">Capabilities</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-surface-2/60">
              <td className="px-4 py-3">
                <div className="font-semibold text-ink">{row.displayName}</div>
                <div className="mt-0.5 font-mono text-xs text-faint">{row.id}</div>
                {(markCheapest && row.id === cheapestId) || (markBestContext && row.id === bestContextId) ? (
                  <span className="mt-1.5 inline-block rounded-full bg-brand/15 px-2 py-0.5 text-[11px] font-bold text-brand">
                    {markCheapest && row.id === cheapestId ? "Cheapest input" : ""}
                    {markBestContext && row.id === bestContextId
                      ? markCheapest && row.id === cheapestId
                        ? " · "
                        : ""
                      : ""}
                    {markBestContext && row.id === bestContextId ? "Largest context" : ""}
                  </span>
                ) : null}
              </td>
              <td className="px-4 py-3">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold text-white",
                    PROVIDER_BADGE_COLOR[row.provider],
                  )}
                >
                  {row.providerLabel}
                </span>
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-ink">{formatUsd(row.inputUSD)}</td>
              <td className="px-4 py-3 text-right tabular-nums text-muted">{formatUsd(row.outputUSD)}</td>
              <td className="px-4 py-3 text-right tabular-nums text-muted">
                {formatContext(row.contextWindow)}
              </td>
              {showClass ? (
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted">
                    <span className={cn("h-2 w-2 rounded-full", CLASS_DOT[classForRow(row)])} />
                    {CLASS_LABEL[classForRow(row)]}
                  </span>
                </td>
              ) : null}
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                  {row.toolCalling ? <Cap>Tools</Cap> : null}
                  {row.vision ? <Cap>Vision</Cap> : null}
                  {row.reasoning ? <Cap>Reasoning</Cap> : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Cap({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-2 px-1.5 py-0.5">
      {children}
    </span>
  );
}