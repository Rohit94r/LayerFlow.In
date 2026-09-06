import { Check, X, Minus } from "@/components/ui/icons";
import { SectionHeading, Reveal } from "@/components/ui/reveal";
import { COMPARISON_ROWS } from "@/lib/data/marketing";

export default function Comparison() {
  return (
    <section id="comparison" className="relative py-16 sm:py-20">
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <SectionHeading

          title={
            <>
              Copy-paste every time, or{" "}
              <span className="text-brand">build context once</span>
            </>
          }
          description="LayerFlow is the difference between re-explaining your work to every AI — and never explaining it again."
        />

        <Reveal delay={0.1}>
          <div className="card mt-10 overflow-hidden">
            <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 border-b border-border bg-surface-2/50 px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-faint sm:px-6">
              <span />
              <span className="w-28 text-center">Raw chats</span>
              <span className="w-28 text-center">Extensions</span>
              <span className="w-28 text-center">
                <span className="font-semibold tracking-tight text-ink">LayerFlow</span>
              </span>
            </div>

            {COMPARISON_ROWS.map((row) => (
              <div
                key={row.label}
                className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 border-b border-border px-5 py-3.5 text-sm last:border-0 sm:px-6"
              >
                <span className="text-muted">{row.label}</span>
                <span className="flex w-28 justify-center">
                  {row.rawChat ? (
                    <Check className="h-4 w-4 text-muted" />
                  ) : (
                    <X className="h-4 w-4 text-faint/50" />
                  )}
                </span>
                <span className="flex w-28 justify-center text-xs font-medium text-muted">
                  {row.extension === "No" ? (
                    <X className="h-4 w-4 text-faint/50" />
                  ) : (
                    row.extension
                  )}
                </span>
                <span className="flex w-28 justify-center">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand text-[#0e1416]">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                </span>
              </div>
            ))}

            <div className="flex items-center gap-2 border-t border-border bg-surface-2/30 px-5 py-3 text-xs text-faint sm:px-6">
              <Minus className="h-3.5 w-3.5" />
              Generic chat-export tools cover capture only. LayerFlow covers the full loop: rescue, compress, improve, price, continue.
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
