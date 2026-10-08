import { existsSync } from 'node:fs';
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
export type AssetKind = 'cover' | 'cover-rtl' | 'cover-portrait' | 'thumb' | 'sigil';

const EXT: Record<AssetKind, string> = {
  cover: 'cover.webp',
  'cover-rtl': 'cover-rtl.webp',
  'cover-portrait': 'cover-portrait.webp',
  thumb: 'thumb.webp',
  sigil: 'sigil.svg',
};

/** Public URL for a project asset (base-path aware). */
export function assetUrl(slug: string, kind: AssetKind): string {
  return url('projects', slug, EXT[kind]).replace(/\/$/, '');
}

/** Gallery image URL by 1-based index. */
export function galleryUrl(slug: string, n: number): string {
  return url('projects', slug, 'gallery', `${String(n).padStart(2, '0')}.webp`).replace(/\/$/, '');
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
