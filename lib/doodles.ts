const DOODLES = [
  "ballet",
  "bikini",
  "chilling",
  "clumsy",
  "coffee",
  "dancing",
  "dog-jump",
  "float",
  "groovy",
  "ice-cream",
  "jumping",
  "laying",
  "loving",
  "meditating",
  "moshing",
  "petting",
  "plant",
  "reading-side",
  "reading",
  "roller-skating",
  "rolling",
  "running",
  "selfie",
  "sitting-reading",
  "sitting",
  "sleek",
  "strolling",
  "swinging",
  "unboxing",
  "zombieing",
] as const;

function hashCode(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function doodleFor(seed: string): string {
  const name = DOODLES[hashCode(seed) % DOODLES.length];
  return `/images/doodles/${name}.svg`;
}

export function doodleForName(name: string | null | undefined): string {
  return doodleFor(name?.trim() ? name : "guest");
}

export function doodleForSlug(slug: string): string {
  return doodleFor(slug);
}
