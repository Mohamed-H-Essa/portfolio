import { describe, it, expect } from 'vitest';
import { point, pathD, lobeOf, confine, LOBE } from './lemniscate';

describe('lemniscate', () => {
  it('passes through the crossing at ±π/2 and reaches ±a at 0 / π', () => {
    for (const t of [-Math.PI / 2, Math.PI / 2, (3 * Math.PI) / 2]) {
      const p = point(t, 100);
      expect(p.x).toBeCloseTo(0, 9);
      expect(p.y).toBeCloseTo(0, 9);
    }
    expect(point(0, 100).x).toBeCloseTo(100, 9);
    expect(point(Math.PI, 100).x).toBeCloseTo(-100, 9);
  });

  it('names the lobe: right = cloud, left = mobile', () => {
    expect(lobeOf(0)).toBe('cloud');
    expect(lobeOf(Math.PI)).toBe('mobile');
    expect(lobeOf(Math.PI * 2 + 0.3)).toBe('cloud');
    expect(lobeOf(-Math.PI + 0.2)).toBe('mobile');
  });

  it('confine keeps t looping inside one lobe without a visible jump', () => {
    // stepping past the end of the right lobe wraps to its start (both are the crossing)
    const t = confine(Math.PI / 2 + 0.01, 'cloud');
    expect(lobeOf(t)).toBe('cloud');
    const a = point(Math.PI / 2 + 0.01, 100), b = point(t, 100);
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeLessThan(3);
    // inside the lobe: untouched
    expect(confine(0.4, 'cloud')).toBe(0.4);
    // in the other lobe: untouched (it travels on until it enters)
    expect(confine(Math.PI, 'cloud')).toBe(Math.PI);
    expect(lobeOf(confine((3 * Math.PI) / 2 + 0.01, 'mobile'))).toBe('mobile');
  });

  it('builds a closed path that starts at the crossing', () => {
    const d = pathD(100, 64);
    expect(d.startsWith('M0.00 0.00') || d.startsWith('M0.00 -0.00') || d.startsWith('M-0.00')).toBe(true);
    expect(d.endsWith('Z')).toBe(true);
    expect(LOBE.cloud[0]).toBeLessThan(LOBE.cloud[1]);
  });
});
