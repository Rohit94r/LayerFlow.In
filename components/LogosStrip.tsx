/* eslint-disable @next/next/no-img-element */
import { providers } from "@/lib/content";

function LogoSet({ offset }: { offset: number }) {
  return (
    <div className="flex shrink-0 items-center gap-12 pr-12 sm:gap-16 sm:pr-16">
      {providers.map((p) => (
        <div
          key={`${p.name}-${offset}`}
          className="flex shrink-0 items-center gap-4"
        >
          <span className="logo-chip flex h-14 w-14 items-center justify-center rounded-2xl sm:h-16 sm:w-16">
            <img
              src={p.src}
              alt={p.name}
              className="h-9 w-9 object-contain opacity-90 sm:h-10 sm:w-10"
              loading="lazy"
            />
          </span>
          <span className="whitespace-nowrap text-base font-medium text-ink/80 sm:text-lg">
            {p.name}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function LogosStrip() {
  return (
    <section className="relative border-y border-border py-14 sm:py-16">
      <p className="mb-10 text-center text-sm font-medium text-faint sm:text-base">
        Routes to every major AI provider — one SDK, one API key
      </p>
      <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
        <div className="flex w-max animate-marquee items-center">
          <LogoSet offset={0} />
          <LogoSet offset={1} />
        </div>
      </div>
    </section>
  );
}
