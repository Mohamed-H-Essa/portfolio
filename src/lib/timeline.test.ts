import { describe, expect, it } from 'vitest';
import { buildTimeline, dateRange, tierOf, phaseOf, type TimelineInput } from './timeline';

const p = (slug: string, start: string, w: [number, number, number], hasArt = true, end = 'present'): TimelineInput => ({
  slug, start, end, hasArt, weight: { mobile: w[0], cloud: w[1], all: w[2] },
});

describe('tierOf', () => {
  it('sizes by the track weight, and only art fills a large card', () => {
    expect(tierOf(p('a', '2025-01', [3, 0, 2]), 'mobile')).toBe('l');
    expect(tierOf(p('a', '2025-01', [3, 0, 2], false), 'mobile')).toBe('m');
    expect(tierOf(p('a', '2025-01', [2, 0, 2]), 'mobile')).toBe('m');
    expect(tierOf(p('a', '2025-01', [2, 0, 2]), 'mobile', 'a')).toBe('l');
    expect(tierOf(p('a', '2025-01', [3, 0, 2]), 'cloud')).toBe('s');
  });
});

describe('buildTimeline', () => {
  const items = [
    p('old', '2024-06', [3, 0, 2]),
    p('new', '2026-10', [2, 0, 2]),
    p('mid-light', '2025-08', [1, 0, 1]),
    p('mid-heavy', '2025-08', [3, 0, 2]),
    p('cloudy', '2026-06', [0, 3, 2]),
  ];
  const tl = buildTimeline(items, 'mobile');

  it('groups by start year, newest year first', () => {
    expect(tl.map((y) => y.year)).toEqual([2026, 2025, 2024]);
  });
  it('orders newest first, and the heavier first within a month', () => {
    expect(tl.flatMap((y) => y.entries.map((e) => e.item.slug))).toEqual(['new', 'cloudy', 'mid-heavy', 'mid-light', 'old']);
  });
  it('keeps off-track projects as quiet rows', () => {
    expect(tl[0].entries.find((e) => e.item.slug === 'cloudy')?.tier).toBe('s');
  });
});

describe('dateRange', () => {
  it('formats ongoing, single-month and same-year ranges', () => {
    expect(dateRange('2026-10', 'present', 'en', 'now')).toBe('Oct 2026 – now');
    expect(dateRange('2025-10', '2025-10', 'en', 'now')).toBe('Oct 2025');
    expect(dateRange('2024-10', '2024-12', 'en', 'now')).toBe('Oct – Dec 2024');
    expect(dateRange('2024-10', '2025-02', 'en', 'now')).toBe('Oct 2024 – Feb 2025');
  });
  it('keeps Latin digits in Arabic', () => {
    expect(dateRange('2025-10', '2025-10', 'ar-u-nu-latn', 'الآن')).toMatch(/2025/);
  });
});

describe('phaseOf', () => {
  it('maps years to career phases', () => {
    expect([2020, 2023, 2025, 2026].map(phaseOf)).toEqual(['s1', 's2', 's3', 's4']);
  });
});
