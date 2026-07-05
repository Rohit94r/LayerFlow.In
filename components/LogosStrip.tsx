/* eslint-disable @next/next/no-img-element */
import { providers } from "@/lib/content";

function LogoSet({ offset }: { offset: number }) {
  return (
    <div className="flex shrink-0 items-center gap-0 pr-10">
      {providers.map((p) => (
        <img
          key={`${p.name}-${offset}`}
          src={p.src}
          alt={p.name}
          className="logo-mono inline h-10 w-auto mx-10 object-contain"
          loading="lazy"
        />
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
