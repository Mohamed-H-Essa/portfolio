import { getCollection, type CollectionEntry } from 'astro:content';
import type { Track } from '../i18n/config';

export type Project = CollectionEntry<'projects'>;

let cache: Project[] | null = null;

/**
 * Load all project/role/cert nodes and validate relational integrity that a
 * per-file zod schema can't see: unique codes, unique slugs, and `connects`
 * pointing at real slugs. Throws at build with a clear message.
 */
export async function loadProjects(): Promise<Project[]> {
  if (cache) return cache;
  const all = await getCollection('projects');

  const slugs = new Set<string>();
  const codes = new Set<string>();
  for (const p of all) {
    if (slugs.has(p.data.slug)) throw new Error(`[content] duplicate slug "${p.data.slug}"`);
    slugs.add(p.data.slug);
    if (codes.has(p.data.code)) throw new Error(`[content] duplicate code "${p.data.code}"`);
    codes.add(p.data.code);
  }
  for (const p of all) {
    for (const c of p.data.connects) {
      if (!slugs.has(c)) {
        throw new Error(`[content] "${p.data.slug}" connects to unknown slug "${c}"`);
      }
    }
  }

  // Chronological order (oldest first) is the canonical reading order.
  all.sort((a, b) => (a.data.start < b.data.start ? -1 : a.data.start > b.data.start ? 1 : 0));
  cache = all;
  return all;
}

/** Projects visible on a track, sorted by that track's weight (desc), then date. */
export async function projectsForTrack(track: Track): Promise<Project[]> {
  const all = await loadProjects();
  return [...all].sort((a, b) => {
    const wa = a.data.weight[track];
    const wb = b.data.weight[track];
    if (wa !== wb) return wb - wa;
    return a.data.start < b.data.start ? 1 : -1; // newer first within a weight
  });
}

/** The single featured project for a track: among `featured` nodes in-world,
 *  the one with the highest weight for this track (ties → newest). */
export async function featuredForTrack(track: Track): Promise<Project | undefined> {
  const all = await loadProjects();
  const candidates = all.filter((p) => p.data.featured && p.data.weight[track] > 0);
  if (!candidates.length) return undefined;
  return candidates.sort((a, b) => {
    const dw = b.data.weight[track] - a.data.weight[track];
    if (dw !== 0) return dw;
    return a.data.start < b.data.start ? 1 : -1;
  })[0];
}

/** Is this node dimmed (off-world) on the given track? */
export function isDimmed(p: Project, track: Track): boolean {
  return p.data.weight[track] === 0;
}

/** Distinct stack entries across the track's in-world projects, by frequency. */
export async function skillsForTrack(track: Track, limit = 14): Promise<string[]> {
  const all = await loadProjects();
  const counts = new Map<string, number>();
  for (const p of all) {
    if (p.data.weight[track] === 0) continue;
    for (const s of p.data.stack) counts.set(s, (counts.get(s) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([s]) => s);
}
