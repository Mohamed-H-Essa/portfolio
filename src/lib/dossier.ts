// Pure helpers for the project dossier pages (no astro:content import, so
// they're unit-tested directly).
import type { Track } from '../i18n/config';

interface SeqNode { slug: string; start: string; weight: Record<Track, number> }

/** In-world nodes for a track, oldest first: the reading order for prev/next. */
export function worldSequence(nodes: SeqNode[], track: Track): string[] {
  return nodes
    .filter((n) => n.weight[track] > 0)
    .sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0))
    .map((n) => n.slug);
}

/** Neighbours of `slug` in a sequence; an off-world node has none. */
export function prevNext(seq: string[], slug: string): { prev: string | null; next: string | null } {
  const i = seq.indexOf(slug);
  if (i < 0) return { prev: null, next: null };
  return { prev: seq[i - 1] ?? null, next: seq[i + 1] ?? null };
}

/** "2024", "2024 – 2026" or "2025 – Present". */
export function yearSpan(start: string, end: string, present: string): string {
  const a = start.slice(0, 4);
  if (end === 'present') return `${a} – ${present}`;
  const b = end.slice(0, 4);
  return a === b ? a : `${a} – ${b}`;
}
