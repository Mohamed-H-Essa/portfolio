import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { url } from '../i18n';

// Resolve from the project root (cwd during `astro build`), not from this
// module's bundled location — import.meta.url moves when Astro bundles this file.
const PUB = join(process.cwd(), 'public', 'projects');

/** Does `npm run assets` output exist for this slug? (build-time, server only) */
export function hasAssets(slug: string): boolean {
  try {
    return existsSync(join(PUB, slug, 'thumb.webp'));
  } catch {
    return false;
  }
}

/** Was this project rendered from real app screenshots (vs. a code/cloud
 *  diagram)? Only screenshot thumbs read well at map-card size; the rest get a
 *  designed Badge there. */
export function hasScreens(slug: string): boolean {
  try {
    return existsSync(join(process.cwd(), 'assets-src', slug, 'shots.yaml'));
  } catch {
    return false;
  }
}

// Generated asset paths under public/projects/<slug>/. `npm run assets` writes
// these; they're committed. A node without generated assets falls back to null
// so components can show a placeholder.
export type AssetKind = 'cover' | 'cover-rtl' | 'cover-portrait' | 'cover-2x' | 'cover-rtl-2x' | 'cover-portrait-2x' | 'thumb' | 'sigil';

const EXT: Record<AssetKind, string> = {
  cover: 'cover.webp',
  'cover-rtl': 'cover-rtl.webp',
  'cover-portrait': 'cover-portrait.webp',
  'cover-2x': 'cover-2x.webp',
  'cover-rtl-2x': 'cover-rtl-2x.webp',
  'cover-portrait-2x': 'cover-portrait-2x.webp',
  thumb: 'thumb.webp',
  sigil: 'sigil.svg',
};

/** Public URL for a project asset (base-path aware). */
export function assetUrl(slug: string, kind: AssetKind): string {
  return url('projects', slug, EXT[kind]).replace(/\/$/, '');
}

/** Gallery image URL by 1-based index (`hi` = the 2× render for the full-screen viewer). */
export function galleryUrl(slug: string, n: number, hi = false): string {
  return url('projects', slug, 'gallery', `${String(n).padStart(2, '0')}${hi ? '-2x' : ''}.webp`).replace(/\/$/, '');
}

/** How many gallery images `npm run assets` produced (01.webp, 02.webp, …). */
export function galleryCount(slug: string): number {
  let n = 0;
  while (existsSync(join(PUB, slug, 'gallery', `${String(n + 1).padStart(2, '0')}.webp`))) n++;
  return n;
}

/** Base-relative path of the project's captioned link-preview image, if generated. */
export function ogPath(slug: string): string | undefined {
  return existsSync(join(PUB, slug, 'og.png')) ? `projects/${slug}/og.png` : undefined;
}

/** The project's own accent (sampled from its hero screen by `npm run assets`),
 *  for its page's subtle colour theme; undefined when there's no generated art. */
export function projectAccent(slug: string): string | undefined {
  try {
    const m = JSON.parse(readFileSync(join(PUB, slug, 'meta.json'), 'utf8')) as { accent?: string };
    return /^#[0-9a-f]{3,8}$/i.test(m.accent ?? '') ? m.accent : undefined;
  } catch {
    return undefined;
  }
}
