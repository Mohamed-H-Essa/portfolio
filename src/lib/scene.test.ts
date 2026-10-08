import { describe, it, expect } from 'vitest';
import { layoutScene, beamGeometry, LAYER_Z, MIN_SEP, type SceneInput } from './scene';

const W = { mobile: 3, cloud: 0, all: 2 };
const input: SceneInput[] = [
  { slug: 'app', code: 'M01', start: '2024-06', worlds: ['mobile'], weight: W, connects: ['ci'], stack: ['Flutter', 'Bloc'] },
  { slug: 'app2', code: 'M02', start: '2024-08', worlds: ['mobile'], weight: W, connects: [], stack: ['Flutter'] },
  { slug: 'ci', code: 'P01', start: '2024-07', worlds: ['origin'], weight: { mobile: 2, cloud: 2, all: 3 }, connects: ['lambda'], stack: ['GitHub Actions'] },
  { slug: 'lambda', code: 'C01', start: '2026-04', worlds: ['cloud'], weight: { mobile: 0, cloud: 3, all: 3 }, connects: [], stack: ['AWS Lambda', 'Flutter'] },
];

/** Apply CSS rotateY(rotY) then rotateZ(rotZ) to +x * length — what the browser does. */
function endOf(a: { x: number; y: number; z: number }, g: ReturnType<typeof beamGeometry>) {
  const ry = (g.rotY * Math.PI) / 180, rz = (g.rotZ * Math.PI) / 180;
  const x1 = g.length * Math.cos(ry), z1 = -g.length * Math.sin(ry); // rotateY
  return { x: a.x + x1 * Math.cos(rz), y: a.y + x1 * Math.sin(rz), z: a.z + z1 }; // rotateZ
}

describe('beamGeometry', () => {
  it('orients a +x line so it ends exactly at b (in-plane and across layers)', () => {
    for (const [a, b] of [
      [{ x: 0, y: 0, z: 0 }, { x: 300, y: 120, z: 0 }],
      [{ x: 100, y: -50, z: 330 }, { x: 900, y: 120, z: -330 }],
      [{ x: 500, y: 0, z: 0 }, { x: 100, y: 0, z: 330 }],
    ]) {
      const end = endOf(a, beamGeometry(a, b));
      expect(end.x).toBeCloseTo(b.x, 6);
      expect(end.y).toBeCloseTo(b.y, 6);
      expect(end.z).toBeCloseTo(b.z, 6);
    }
  });
});

describe('layoutScene', () => {
  const l = layoutScene(input, 'mobile', { featured: 'app' });

  it('puts every card on its primary layer height', () => {
    const z = Object.fromEntries(l.cards.map((c) => [c.slug, c.z]));
    expect(z.app).toBe(LAYER_Z.mobile);
    expect(z.ci).toBe(LAYER_Z.origin);
    expect(z.lambda).toBe(LAYER_Z.cloud);
  });

  it('keeps time order on x (LTR) and mirrors it in RTL', () => {
    const x = (lay: typeof l, s: string) => lay.cards.find((c) => c.slug === s)!.x;
    expect(x(l, 'app')).toBeLessThan(x(l, 'lambda'));
    const r = layoutScene(input, 'mobile', { dir: 'rtl' });
    expect(x(r, 'app')).toBeGreaterThan(x(r, 'lambda'));
  });

  it('separates close cards in the same layer into different rows', () => {
    const a = l.cards.find((c) => c.slug === 'app')!;
    const b = l.cards.find((c) => c.slug === 'app2')!;
    expect(Math.abs(a.x - b.x)).toBeLessThan(250);
    expect(a.y).not.toBe(b.y);
  });

  it('keeps same-layer cards at least MIN_SEP apart on x, in time order (LTR and RTL)', () => {
    const crowd: SceneInput[] = ['2026-04', '2026-05', '2026-06', '2026-07'].map((start, i) => ({
      slug: `c${i}`, code: `C0${i}`, start, worlds: ['cloud'], weight: W, connects: [], stack: [],
    }));
    for (const dir of ['ltr', 'rtl'] as const) {
      const xs = layoutScene(crowd, 'all', { dir }).cards.map((c) => c.x);
      const sorted = dir === 'ltr' ? xs : [...xs].reverse();
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i] - sorted[i - 1]).toBeGreaterThanOrEqual(MIN_SEP - 1e-6);
      }
    }
  });

  it('dims off-track cards and flags the featured one', () => {
    expect(l.cards.find((c) => c.slug === 'lambda')!.dimmed).toBe(true);
    expect(l.cards.find((c) => c.slug === 'app')!.featured).toBe(true);
  });

  it('builds one beam per connection, crossing layers', () => {
    expect(l.beams.map((b) => `${b.from}>${b.to}`).sort()).toEqual(['app>ci', 'ci>lambda']);
    const cross = l.beams.find((b) => b.from === 'ci')!;
    expect(cross.a.z).not.toBe(cross.b.z);
  });

  it('engraves each skill once, on the layer that uses it most', () => {
    const names = l.skills.map((s) => s.name);
    expect(new Set(names).size).toBe(names.length);
    expect(l.skills.find((s) => s.name === 'Flutter')!.layer).toBe('mobile'); // 2 mobile uses vs 1 cloud
    expect(l.skills.find((s) => s.name === 'Flutter')!.slugs.sort()).toEqual(['app', 'app2', 'lambda']);
  });

  it('never overlaps skills in the same strip', () => {
    for (const layer of ['mobile', 'origin', 'cloud'] as const) {
      for (const band of [-232, 232]) {
        const row = l.skills.filter((s) => s.layer === layer && s.y === band).sort((a, b) => a.x - b.x);
        for (let i = 1; i < row.length; i++) {
          const prevHalf = (row[i - 1].name.length * 12.5 + 34) / 2;
          const half = (row[i].name.length * 12.5 + 34) / 2;
          expect(row[i].x - row[i - 1].x).toBeGreaterThanOrEqual(prevHalf + half - 1e-6);
        }
      }
    }
  });

  it('starts the camera on the featured card and emits year lines', () => {
    expect(l.start.x).toBe(l.cards.find((c) => c.slug === 'app')!.x);
    expect(l.years.map((y) => y.year)).toEqual(expect.arrayContaining([2024, 2025, 2026]));
  });

  it('repeats the engraved layer name along the plane, inside it', () => {
    const wide = layoutScene(
      [...input, { slug: 'late', code: 'C09', start: '2029-01', worlds: ['cloud'], weight: W, connects: [], stack: [] }],
      'all'
    );
    for (const pl of wide.planes) {
      expect(pl.titleXs.length).toBeGreaterThan(1);
      for (const x of pl.titleXs) expect(x).toBeGreaterThanOrEqual(0), expect(x).toBeLessThanOrEqual(pl.width);
    }
  });

  it('handles empty input', () => {
    expect(layoutScene([], 'all').cards).toHaveLength(0);
  });
});
