import { SectionHeading } from "@/components/ui/reveal";
import { PROBLEM_POINTS } from "@/lib/data/marketing";
import { MessageSquareWarning, Timer, History, DollarSign } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ICONS: LucideIcon[] = [MessageSquareWarning, Timer, History, DollarSign];

export default function Problem() {
  return (
    <section id="problem" className="relative py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          eyebrow="The problem"
          title={
            <>
              Your best AI work is trapped
              <br />
              in <span className="text-brand">dead chats</span>
            </>
          }
          description="Every week you switch models, hit limits, and lose the thread. That's not a tools problem — it's a context problem."
        />

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PROBLEM_POINTS.map((point, i) => {
            const Icon = ICONS[i];
            return (
              <div key={point.title} className="card card-hover group relative overflow-hidden p-6">
                <div
                  className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
                  style={{ background: "var(--glow-amber)" }}
                  aria-hidden
                />
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface-2 text-brand">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-base font-semibold text-ink">{point.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{point.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
