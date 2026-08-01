import { SectionHeading, Reveal } from "@/components/ui/reveal";
import { USE_CASES } from "@/lib/data/marketing";
import {
  LifeBuoy,
  Shuffle,
  PiggyBank,
  Briefcase,
  GraduationCap,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  "lifebuoy": LifeBuoy,
  "shuffle": Shuffle,
  "piggy-bank": PiggyBank,
  "briefcase": Briefcase,
  "graduation-cap": GraduationCap,
  "users": Users,
};

export default function UseCases() {
  return (
    <section id="use-cases" className="relative py-16 sm:py-20">
      <div className="absolute inset-0 grid-lines opacity-30" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          eyebrow="Use cases"
          title={
            <>
              Made for people who{" "}
              <span className="text-brand">live in AI tools</span>
            </>
          }
          description="Founders, writers, students, engineers — anyone whose work spans multiple AI models."
        />

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {USE_CASES.map((uc, i) => {
            const Icon = ICONS[uc.icon] ?? LifeBuoy;
            return (
              <Reveal key={uc.title} delay={(i % 3) * 0.08}>
                <div className="card card-hover group h-full p-6">
                  <div className="flex items-center justify-between">
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface-2 text-brand">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-[11px] font-medium text-faint opacity-0 transition-opacity group-hover:opacity-100">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className="mt-5 text-base font-semibold text-ink">{uc.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{uc.description}</p>
                  <p className="mt-4 rounded-xl border border-border bg-surface-2/60 px-3.5 py-2.5 font-mono text-[11px] leading-relaxed text-brand">
                    {uc.example}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
