import { describe, it, expect } from 'vitest';
import { layoutScene, beamGeometry, MIN_SEP, MIN_DY, SKILL_CHAR_W, SKILL_GAP, LANE_W, type SceneInput } from './scene';

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
  const card = (lay: typeof l, s: string) => lay.cards.find((c) => c.slug === s)!;
  const lane = (lay: typeof l, layer: string) => lay.planes.find((p) => p.layer === layer)!;

  it('stands every card inside its primary lane, on the floor', () => {
    for (const [slug, layer] of [['app', 'mobile'], ['ci', 'origin'], ['lambda', 'cloud']]) {
      const c = card(l, slug), p = lane(l, layer);
      expect(c.layer).toBe(layer);
      expect(c.x).toBeGreaterThan(p.x0);
      expect(c.x).toBeLessThan(p.x0 + p.width);
      expect(c.z).toBe(0);
    }
  });

  it('puts the lanes side by side, mobile → platform → cloud, mirrored in RTL', () => {
    const xs = (lay: typeof l) => ['mobile', 'origin', 'cloud'].map((k) => lane(lay, k).x0);
    const [m, o, c] = xs(l);
    expect(m).toBeLessThan(o);
    expect(o).toBeLessThan(c);
    expect(o - m).toBeGreaterThanOrEqual(LANE_W);
    const [rm, ro, rc] = xs(layoutScene(input, 'mobile', { dir: 'rtl' }));
    expect(rm).toBeGreaterThan(ro);
    expect(ro).toBeGreaterThan(rc);
  });

  it('runs time down the y axis in every language (never mirrored)', () => {
    for (const dir of ['ltr', 'rtl'] as const) {
      const r = layoutScene(input, 'mobile', { dir });
      expect(card(r, 'app').y).toBeLessThan(card(r, 'lambda').y);
      expect(card(r, 'ci').y).toBeLessThan(card(r, 'lambda').y);
      const ys = r.years.map((y) => y.y);
      expect([...ys].sort((a, b) => a - b)).toEqual(ys);
    }
  });

  it('zig-zags close cards in a lane into different columns', () => {
    const a = card(l, 'app'), b = card(l, 'app2');
    expect(Math.abs(a.y - b.y)).toBeLessThan(MIN_DY);
    expect(a.x).not.toBe(b.x);
  });

  it('keeps lane cards in time order, MIN_SEP apart, and same-column cards MIN_DY apart', () => {
    const crowd: SceneInput[] = ['2026-04', '2026-05', '2026-06', '2026-07', '2026-07'].map((start, i) => ({
      slug: `c${i}`, code: `C0${i}`, start, worlds: ['cloud'], weight: W, connects: [], stack: [],
    }));
    for (const dir of ['ltr', 'rtl'] as const) {
      const cs = layoutScene(crowd, 'all', { dir }).cards;
      for (let i = 1; i < cs.length; i++) expect(cs[i].y - cs[i - 1].y).toBeGreaterThanOrEqual(MIN_SEP - 1e-6);
      for (const x of new Set(cs.map((c) => c.x))) {
        const col = cs.filter((c) => c.x === x).map((c) => c.y);
        for (let i = 1; i < col.length; i++) expect(col[i] - col[i - 1]).toBeGreaterThanOrEqual(MIN_DY - 1e-6);
      }
    }
  });

  it('dims off-track cards and flags the featured one', () => {
    expect(card(l, 'lambda').dimmed).toBe(true);
    expect(card(l, 'app').featured).toBe(true);
  });

  it('builds one beam per connection, crossing lanes', () => {
    expect(l.beams.map((b) => `${b.from}>${b.to}`).sort()).toEqual(['app>ci', 'ci>lambda']);
    const cross = l.beams.find((b) => b.from === 'ci')!;
    expect(cross.a.x).not.toBe(cross.b.x);
  });

  it('engraves each skill once, on the lane that uses it most', () => {
    const names = l.skills.map((s) => s.name);
    expect(new Set(names).size).toBe(names.length);
    const flutter = l.skills.find((s) => s.name === 'Flutter')!;
    expect(flutter.layer).toBe('mobile'); // 2 mobile uses vs 1 cloud
    expect(flutter.slugs.sort()).toEqual(['app', 'app2', 'lambda']);
    const p = lane(l, 'mobile');
    expect(flutter.x).toBeGreaterThan(p.x0);
    expect(flutter.x).toBeLessThan(p.x0 + p.width);
  });

  it('never overlaps skills along the same lane edge', () => {
    const many: SceneInput[] = input.map((n) => ({ ...n, stack: [...n.stack, 'Terraform', 'Docker', 'Kubernetes', 'Fastlane'] }));
    const r = layoutScene(many, 'all');
    const half = (n: string) => (n.length * SKILL_CHAR_W + SKILL_GAP) / 2;
    for (const x of new Set(r.skills.map((s) => s.x))) {
      const edge = r.skills.filter((s) => s.x === x).sort((a, b) => a.y - b.y);
      for (let i = 1; i < edge.length; i++) {
        expect(edge[i].y - edge[i - 1].y).toBeGreaterThanOrEqual(half(edge[i - 1].name) + half(edge[i].name) - 1e-6);
      }
    }
  });

  it('starts the camera mid-lanes on the featured card and emits year lines', () => {
    expect(l.start.y).toBe(card(l, 'app').y);
    expect(l.start.x).toBeGreaterThan(l.xRange[0]);
    expect(l.start.x).toBeLessThan(l.xRange[1]);
    expect(l.years.map((y) => y.year)).toEqual(expect.arrayContaining([2024, 2025, 2026]));
  });

  it('puts the year axis outside the lanes on the inline-start side', () => {
    const xs = l.planes.map((p) => p.x0);
    expect(l.axisX).toBeLessThan(Math.min(...xs));
    const r = layoutScene(input, 'all', { dir: 'rtl' });
    expect(r.axisX).toBeGreaterThan(Math.max(...r.planes.map((p) => p.x0 + p.width)));
  });

  it('repeats lane names down the lane, clear of cards and year lines', () => {
    const wide = layoutScene(
      [...input, { slug: 'late', code: 'C09', start: '2029-01', worlds: ['cloud'], weight: W, connects: [], stack: [] }],
      'all'
    );
    for (const pl of wide.planes) {
      expect(pl.titleYs.length).toBeGreaterThan(1);
      const own = wide.cards.filter((c) => c.layer === pl.layer);
      for (const y of pl.titleYs) {
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(pl.depth);
        for (const yr of wide.years) expect(Math.abs(y - yr.y)).toBeGreaterThanOrEqual(60);
        for (const c of own) expect(y - c.y >= 90 || c.y - y >= 380).toBe(true);
      }
    }
  });

  it('handles empty input', () => {
    expect(layoutScene([], 'all').cards).toHaveLength(0);
  });
});
