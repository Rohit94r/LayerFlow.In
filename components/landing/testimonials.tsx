import { SectionHeading, Reveal } from "@/components/ui/reveal";
import { TESTIMONIALS } from "@/lib/data/marketing";
import { Star } from "@/components/ui/icons";
import { Avatar } from "@/components/ui/avatar";

export default function Testimonials() {
  return (
    <section id="testimonials" className="relative py-16 sm:py-20">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brand/[0.03] to-transparent" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading

          title={
            <>
              People who stopped{" "}
              <span className="text-brand">re-explaining everything</span>
            </>
          }
        />

        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <Reveal key={t.name} delay={(i % 3) * 0.08}>
              <figure className="card card-hover flex h-full flex-col p-6">
                <div className="flex items-center gap-1" aria-label="5 out of 5 stars">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star key={s} className="h-3.5 w-3.5 fill-brand text-brand" />
                  ))}
                </div>
                <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-ink/90">
                  “{t.quote}”
                </blockquote>
                <figcaption className="mt-6 flex items-center gap-3 border-t border-border pt-4">
                  <Avatar initials={t.initials} color={t.color} />
                  <div>
                    <p className="text-sm font-semibold text-ink">{t.name}</p>
                    <p className="text-xs text-muted">{t.role}</p>
                  </div>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
