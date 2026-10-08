import { describe, it, expect } from 'vitest';
import { worldSequence, prevNext, yearSpan } from './dossier';

const n = (slug: string, start: string, w: { mobile: number; cloud: number; all: number }) => ({ slug, start, weight: w });
const nodes = [
  n('c', '2026-04', { mobile: 0, cloud: 3, all: 3 }),
  n('a', '2024-06', { mobile: 3, cloud: 0, all: 2 }),
  n('p', '2024-07', { mobile: 2, cloud: 2, all: 3 }),
  n('b', '2025-01', { mobile: 3, cloud: 0, all: 2 }),
];

describe('worldSequence', () => {
  it('keeps only in-world nodes, oldest first', () => {
    expect(worldSequence(nodes, 'mobile')).toEqual(['a', 'p', 'b']);
    expect(worldSequence(nodes, 'cloud')).toEqual(['p', 'c']);
    expect(worldSequence(nodes, 'all')).toEqual(['a', 'p', 'b', 'c']);
  });
});

describe('prevNext', () => {
  it('returns neighbours in the sequence, null at the ends', () => {
    expect(prevNext(['a', 'p', 'b'], 'p')).toEqual({ prev: 'a', next: 'b' });
    expect(prevNext(['a', 'p', 'b'], 'a')).toEqual({ prev: null, next: 'p' });
    expect(prevNext(['a', 'p', 'b'], 'b')).toEqual({ prev: 'p', next: null });
  });
  it('handles an off-world node (not in the sequence): no neighbours', () => {
    expect(prevNext(['a', 'p'], 'c')).toEqual({ prev: null, next: null });
  });
});

describe('yearSpan', () => {
  it('formats single year, ranges and present', () => {
    expect(yearSpan('2024-06', '2024-11', 'Present')).toBe('2024');
    expect(yearSpan('2024-06', '2026-01', 'Present')).toBe('2024 – 2026');
    expect(yearSpan('2025-01', 'present', 'Present')).toBe('2025 – Present');
  });
});
