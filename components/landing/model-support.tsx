import { SectionHeading, Reveal } from "@/components/ui/reveal";
import { SUPPORTED_MODELS } from "@/lib/data/marketing";
import { Sparkles, Cpu, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ModelSupport() {
  return (
    <section id="models" className="relative scroll-mt-20 py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          eyebrow="Supported AI models"
          title={
            <>
              One platform.{" "}
              <span className="text-brand">Every major model.</span>
            </>
          }
          description="Free and paid models in one workspace. Bring your own keys (BYOK) — pay providers directly, and LayerFlow suggests the best model for every task."
        />

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          {SUPPORTED_MODELS.map((group, gi) => (
            <Reveal key={group.group} delay={gi * 0.1}>
              <div
                className={cn(
                  "relative h-full overflow-hidden rounded-2xl border p-6",
                  group.group === "Free"
                    ? "border-emerald-500/20 bg-gradient-to-b from-emerald-500/5 to-transparent"
                    : "border-brand/20 bg-gradient-to-b from-brand/5 to-transparent",
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-xl",
                        group.group === "Free"
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-brand/15 text-brand",
                      )}
                    >
                      {group.group === "Free" ? <Sparkles className="h-4.5 w-4.5" /> : <Cpu className="h-4.5 w-4.5" />}
                    </span>
                    <h3 className="text-lg font-semibold text-ink">{group.group} models</h3>
                  </div>
                  <span className="rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-faint">
                    {group.items.length} supported
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted">{group.note}</p>

                <div className="mt-5 grid gap-1.5 sm:grid-cols-2">
                  {group.items.map((m) => (
                    <div
                      key={m.name}
                      className="flex items-center gap-2.5 rounded-lg border border-border bg-surface-2/40 px-3 py-2"
                    >
                      <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      <span className="truncate text-[13px] font-medium text-ink">{m.name}</span>
                      <span className="ml-auto shrink-0 truncate text-[10px] text-faint">{m.provider}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal>
          <p className="mt-8 text-center text-sm text-faint">
            + any OpenAI-compatible endpoint via BYOK — add your own model in minutes.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
