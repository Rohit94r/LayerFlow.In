import { createAvatar } from "@dicebear/core";
import { create as avataaarsCreate, meta as avataaarsMeta, schema as avataaarsSchema } from "@dicebear/avataaars";
import { create as funEmojiCreate, meta as funEmojiMeta, schema as funEmojiSchema } from "@dicebear/fun-emoji";
import { create as loreleiCreate, meta as loreleiMeta, schema as loreleiSchema } from "@dicebear/lorelei";
import { create as notionistsCreate, meta as notionistsMeta, schema as notionistsSchema } from "@dicebear/notionists";

const styles = {
  avataaars: { create: avataaarsCreate, meta: avataaarsMeta, schema: avataaarsSchema },
  "fun-emoji": { create: funEmojiCreate, meta: funEmojiMeta, schema: funEmojiSchema },
  lorelei: { create: loreleiCreate, meta: loreleiMeta, schema: loreleiSchema },
  notionists: { create: notionistsCreate, meta: notionistsMeta, schema: notionistsSchema },
} as const;

export type AvatarStyle = keyof typeof styles;

function hashCode(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash;
}

const styleKeys = Object.keys(styles) as AvatarStyle[];

function pickStyle(seed: string): AvatarStyle {
  return styleKeys[hashCode(seed) % styleKeys.length];
}

function generateDataUri(seed: string, style?: AvatarStyle): string {
  const s = style ?? pickStyle(seed);
  const avatar = createAvatar(styles[s] as never, { seed, size: 128 });
  return avatar.toDataUri();
}

export function doodleFor(seed: string): string {
  return generateDataUri(seed);
}

export function doodleForName(name: string | null | undefined): string {
  return generateDataUri(name?.trim() ? name : "guest");
}

const SLUG_DOODLES = [
  "ballet", "bikini", "chilling", "clumsy", "coffee", "dancing",
  "dog-jump", "float", "groovy", "ice-cream", "jumping", "laying",
  "loving", "meditating", "moshing", "petting", "plant", "reading-side",
  "reading", "roller-skating", "rolling", "running", "selfie",
  "sitting-reading", "sitting", "sleek", "strolling", "swinging",
  "unboxing", "zombieing",
] as const;

export function doodleForSlug(slug: string): string {
  const name = SLUG_DOODLES[hashCode(slug) % SLUG_DOODLES.length];
  return `/images/doodles/${name}.svg`;
}
