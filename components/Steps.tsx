import { ArrowRight, Clock } from "lucide-react";
import { steps } from "@/lib/content";
import CodeWindow from "./CodeWindow";
import Reveal from "./Reveal";

export default function Steps() {
  return (
    <section id="docs" className="mx-auto max-w-7xl scroll-mt-24 px-5 py-20 sm:px-8 sm:py-28">
      <Reveal>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold text-ink sm:text-4xl">
            Get started in 3 simple steps
          </h2>
          <p className="mt-4 text-muted">
            From zero to full production visibility in minutes. No complex setup
            or code rewrites required.
          </p>
          <a
            href="#demo"
            className="group mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-brand"
          >
            Read the full guide
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </a>
        </div>
      </Reveal>

      <div className="mt-14 grid gap-6 md:grid-cols-3">
        {steps.map((s, i) => (
          <Reveal key={s.n} delay={i * 0.1}>
            <div className="card card-hover flex h-full flex-col p-6">
              <div className="mb-5 flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-2 text-sm font-semibold text-white">
                  {s.n}
                </span>
                <h3 className="text-lg font-semibold text-ink">{s.title}</h3>
              </div>
              <p className="mb-5 text-sm text-muted">{s.desc}</p>
              <div className="mt-auto">
                <CodeWindow lang={s.lang} lines={s.code} />
                <div className="mt-3 flex items-center gap-1.5 text-xs text-faint">
                  <Clock className="h-3.5 w-3.5" />
                  {s.time}
                </div>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
