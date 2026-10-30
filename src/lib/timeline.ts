// Pure model for the vertical timeline (Timeline.astro): newest first, grouped by
// year, each project sized by how much it matters on the current track. No DOM,
// no Astro — tested in timeline.test.ts.
import type { Track } from '../i18n/config';

/** l = a large card with the cover art, m = a card with a thumbnail, s = a one-line
 *  row (the project is off-track: still in the history, but quiet). */
export type Tier = 'l' | 'm' | 's';

export interface TimelineInput {
  slug: string;
  start: string; // YYYY-MM
  end: string; // YYYY-MM | 'present'
  weight: Record<Track, number>;
  hasArt: boolean; // generated cover/thumb exist
}
export interface TimelineEntry<T> { item: T; tier: Tier }
export interface TimelineYear<T> { year: number; entries: TimelineEntry<T>[] }

export function tierOf(p: TimelineInput, track: Track, featured?: string): Tier {
  const w = p.weight[track];
  if (w === 0) return 's';
  // a large card needs art to fill it; an art-less key project stays a card
  return (w >= 3 || p.slug === featured) && p.hasArt ? 'l' : 'm';
}

/** Newest first (by start month; the same month → heavier first), grouped by start year. */
export function buildTimeline<T extends TimelineInput>(items: T[], track: Track, featured?: string): TimelineYear<T>[] {
  const sorted = [...items].sort((a, b) =>
    a.start !== b.start ? (a.start < b.start ? 1 : -1) : b.weight[track] - a.weight[track] || a.slug.localeCompare(b.slug)
  );
  const years: TimelineYear<T>[] = [];
  for (const item of sorted) {
    const year = Number(item.start.slice(0, 4));
    let g = years[years.length - 1];
    if (!g || g.year !== year) years.push((g = { year, entries: [] }));
    g.entries.push({ item, tier: tierOf(item, track, featured) });
  }
  return years;
}

/** Career phase for a year (the caption under each year): the i18n key suffix. */
export const phaseOf = (y: number) => (y <= 2021 ? 's1' : y <= 2023 ? 's2' : y <= 2025 ? 's3' : 's4');

/** "Oct 2026 – now", "Oct – Dec 2024", "Oct 2025", in the page's language
 *  (`intl` like 'en', 'de', 'ar-u-nu-latn'; `now` is the localized word). */
export function dateRange(start: string, end: string, intl: string, now: string): string {
  const fmt = (ym: string, year = true) => {
    const [y, m] = ym.split('-').map(Number);
    return new Intl.DateTimeFormat(intl, { month: 'short', ...(year ? { year: 'numeric' } : {}), timeZone: 'UTC' })
      .format(new Date(Date.UTC(y, m - 1, 1)));
  };
  if (end === 'present') return `${fmt(start)} – ${now}`;
  if (end === start) return fmt(start);
  if (end.slice(0, 4) === start.slice(0, 4)) return `${fmt(start, false)} – ${fmt(end)}`;
  return `${fmt(start)} – ${fmt(end)}`;
}
