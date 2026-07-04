/* eslint-disable @next/next/no-img-element */
import { companies } from "@/lib/content";

export default function LogosStrip() {
  const row = [...companies, ...companies];
  return (
    <section className="relative border-y border-border py-12">
      <p className="mb-8 text-center text-sm text-faint">
        Trusted by teams shipping AI at scale
      </p>
      <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
        <div className="flex w-max animate-marquee items-center gap-16 px-8">
          {row.map((c, i) => (
            <img
              key={`${c.name}-${i}`}
              src={c.src}
              alt={c.name}
              className="logo-mono h-6 w-auto sm:h-7"
              loading="lazy"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
