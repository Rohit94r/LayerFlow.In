import { SectionHeading, Reveal } from "@/components/ui/reveal";
import { ROADMAP } from "@/lib/data/marketing";
import { CheckCircle2, CircleDashed, Hammer } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

const STATUS = {
  live: { icon: CheckCircle2, label: "Live", cls: "text-brand" },
  building: { icon: Hammer, label: "Building now", cls: "text-brand" },
  planned: { icon: CircleDashed, label: "Planned", cls: "text-faint" },
} as const;

export default function Roadmap() {
  return (
    <section id="roadmap" className="relative py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <SectionHeading

          title={
            <>
              One context system,{" "}
              <span className="text-brand">four layers deep</span>
            </>
          }
          description="From web rescue reports to a developer memory layer — built in order of real user need."
        />

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {ROADMAP.map((phase, i) => {
            const status = STATUS[phase.status];
            return (
              <Reveal key={phase.phase} delay={(i % 2) * 0.08}>
                <div
                  className={cn(
                    "card h-full p-6",
                    phase.status === "building" && "border-brand/30",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-faint">
                      {phase.phase}
                    </span>
                    <span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold", status.cls)}>
                      <status.icon className="h-3.5 w-3.5" />
                      {status.label}
                    </span>
                  </div>
                  <h3 className="mt-3 text-lg font-semibold text-ink">{phase.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{phase.description}</p>
                  <div className="mt-5 flex flex-wrap gap-1.5">
                    {phase.items.map((item) => (
                      <span key={item} className="chip">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
