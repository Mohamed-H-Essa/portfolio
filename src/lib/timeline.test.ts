import { describe, it, expect } from 'vitest';
import { layoutTimeline, type TLInput } from './timeline';

const sample: TLInput[] = [
  { slug: 'a', code: 'M01', start: '2022-01', worlds: ['mobile'], weight: { mobile: 3, cloud: 0, all: 2 }, connects: ['c'] },
  { slug: 'b', code: 'C01', start: '2026-06', worlds: ['cloud'], weight: { mobile: 0, cloud: 3, all: 2 }, connects: [] },
  { slug: 'c', code: 'O01', start: '2024-07', worlds: ['origin'], weight: { mobile: 2, cloud: 2, all: 3 }, connects: [] },
];

describe('layoutTimeline', () => {
  it('returns a node per input', () => {
    const l = layoutTimeline(sample, 'all');
    expect(l.nodes).toHaveLength(3);
  });

  it('places each node in its primary-world lane', () => {
    const l = layoutTimeline(sample, 'all');
    expect(l.nodes.find((n) => n.slug === 'a')!.lane).toBe('mobile');
    expect(l.nodes.find((n) => n.slug === 'b')!.lane).toBe('cloud');
    expect(l.nodes.find((n) => n.slug === 'c')!.lane).toBe('origin');
  });

  it('orders nodes left→right by time in LTR', () => {
    const l = layoutTimeline(sample, 'all', 'ltr');
    const a = l.nodes.find((n) => n.slug === 'a')!; // 2022
    const b = l.nodes.find((n) => n.slug === 'b')!; // 2026
    expect(a.x).toBeLessThan(b.x);
  });

  it('mirrors x in RTL so time flows right→left', () => {
    const l = layoutTimeline(sample, 'all', 'rtl');
    const a = l.nodes.find((n) => n.slug === 'a')!; // earliest → rightmost
    const b = l.nodes.find((n) => n.slug === 'b')!; // latest → leftmost
    expect(a.x).toBeGreaterThan(b.x);
  });

  it('dims nodes with zero weight on the track', () => {
    const l = layoutTimeline(sample, 'mobile');
    expect(l.nodes.find((n) => n.slug === 'b')!.dimmed).toBe(true); // cloud node on mobile
    expect(l.nodes.find((n) => n.slug === 'a')!.dimmed).toBe(false);
  });

  it('builds an edge for each resolvable connection, once', () => {
    const l = layoutTimeline(sample, 'all');
    expect(l.edges).toHaveLength(1);
    expect(l.edges[0]).toMatchObject({ from: 'a', to: 'c' });
  });

  it('ignores connections to unknown slugs', () => {
    const l = layoutTimeline(
      [{ slug: 'x', code: 'M01', start: '2022-01', worlds: ['mobile'], weight: { mobile: 1, cloud: 0, all: 1 }, connects: ['ghost'] }],
      'all'
    );
    expect(l.edges).toHaveLength(0);
  });

  it('emits a year tick per spanned year', () => {
    const l = layoutTimeline(sample, 'all');
    const yrs = l.years.map((y) => y.year);
    expect(yrs).toContain(2022);
    expect(yrs).toContain(2026);
  });

  it('handles empty input', () => {
    const l = layoutTimeline([], 'all');
    expect(l.nodes).toHaveLength(0);
    expect(l.width).toBeGreaterThan(0);
  });
});
