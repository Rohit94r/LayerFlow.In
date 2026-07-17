/* eslint-disable @next/next/no-img-element */
import { providers } from "@/lib/marketing-content";

function LogoSet({ offset }: { offset: number }) {
  return (
    <div className="flex shrink-0 items-center gap-0 pr-16">
      {providers.map((p) => (
        <img
          key={`${p.name}-${offset}`}
          src={p.src}
          alt={p.name}
          className="logo-mono mx-12 inline h-12 w-auto object-contain sm:mx-14 sm:h-14"
          loading="lazy"
        />
      ))}
    </div>
  );
}

export default function LogosStrip() {
  return (
    <section className="relative w-full overflow-hidden border-y border-border py-16 sm:py-20">
      <p className="mb-12 text-center text-sm font-medium text-faint sm:text-base md:text-lg">
        Every LLM you use — organized in one workspace
      </p>
      <div className="relative w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]">
        <div className="flex w-max animate-marquee items-center">
          <LogoSet offset={0} />
          <LogoSet offset={1} />
          <LogoSet offset={2} />
          <LogoSet offset={3} />
        </div>
      </div>
    </section>
  );
}
