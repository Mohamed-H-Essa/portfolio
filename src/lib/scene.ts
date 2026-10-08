// Pure layout for the layered 3D map. Produces world-space coordinates (px)
// for: three stacked planes (mobile / platform / cloud), project cards that
// stand on their plane, beams between connected projects, skills engraved on
// the planes near the projects that use them, and year gridlines.
//
// Axes (world space, before the camera): x = time, y = depth across a plane,
// z = up (layer height). The Scene component renders these with CSS 3D; the
// camera script only moves the camera, never the layout. No DOM here — tested.
import type { Track } from '../i18n/config';

export type Layer = 'mobile' | 'origin' | 'cloud'; // origin = the "Platform" layer

export interface SceneInput {
  slug: string;
  code: string;
  start: string; // YYYY-MM
  worlds: Layer[];
  weight: Record<Track, number>;
  connects: string[];
  stack: string[];
}

export interface Vec3 { x: number; y: number; z: number }

export interface SceneCard extends Vec3 {
  slug: string;
  code: string;
  layer: Layer;
  year: number;
  dimmed: boolean;
  featured: boolean;
}
export interface ScenePlane {
  layer: Layer;
  z: number;
  x0: number; // left edge
  width: number;
  y0: number; // back edge
  depth: number;
  /** x positions of the engraved layer name: from the start of time (left in
   *  LTR, right in RTL), repeated along the plane so one is always on screen */
  titleXs: number[];
}
export interface SceneBeam {
  from: string;
  to: string;
  a: Vec3;
  b: Vec3;
  /** CSS-ready: length and the two rotations that orient a +x line from a to b */
  length: number;
  rotZ: number; // deg
  rotY: number; // deg
}
export interface SceneSkill extends Vec3 {
  name: string;
  layer: Layer;
  slugs: string[]; // projects that use it (for hover lighting)
}
export interface SceneYear { year: number; x: number }

export interface SceneLayout {
  planes: ScenePlane[];
  cards: SceneCard[];
  beams: SceneBeam[];
  skills: SceneSkill[];
  years: SceneYear[];
  /** camera clamp range for the focus x */
  xRange: [number, number];
  /** where the camera should start */
  start: Vec3;
}

export const LAYERS: Layer[] = ['mobile', 'origin', 'cloud'];
// The gap must exceed lift + a card's height in world units at the default zoom,
// or the plane above slices through the top of every billboard.
export const LAYER_Z: Record<Layer, number> = { mobile: 430, origin: 0, cloud: -430 };
export const PLANE_DEPTH = 600; // y extent of a plane
export const CARD_LIFT = 46; // how high a card floats above its plane
const MONTH_W = 30;
const PAD_START = 520; // room before the first card for the engraved title
const PAD_END = 360;
const ROWS = [0, -150, 150]; // card rows across a plane's depth, in preference order
const MIN_DX = 250; // cards in the same row closer than this get a different row
/** Same-layer cards are nudged forward in time to at least this far apart on x,
 *  so billboards in different rows never stack fully on screen. Cards still
 *  print their real year; the nudge is at most a few months per crowded node. */
export const MIN_SEP = 150;
const SKILL_BANDS = [-232, 232]; // back / front strips where skills are engraved
const SKILL_CHAR_W = 12.5; // approx. advance per char of the engraved skill font
const SKILL_GAP = 34;
export const TITLE_EVERY = 1150; // repeat the engraved layer name this often on x
const TITLE_W = 700; // approx. width of an engraved name; never start one that would run off

function monthIndex(ym: string): number {
  const [y, m] = ym.split('-').map(Number);
  return y * 12 + (m - 1);
}

/** Orientation for a CSS line element placed at `a` pointing to `b`. */
export function beamGeometry(a: Vec3, b: Vec3): { length: number; rotZ: number; rotY: number } {
  const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
  const h = Math.hypot(dx, dy);
  const length = Math.hypot(h, dz);
  const rotZ = (Math.atan2(dy, dx) * 180) / Math.PI;
  // CSS rotateY(θ) maps +x to (cosθ, 0, -sinθ); we want the z component = dz/L
  const rotY = (-Math.atan2(dz, h) * 180) / Math.PI;
  return { length, rotZ, rotY };
}

function titleStarts(width: number): number[] {
  const xs: number[] = [];
  for (let x = 70; x === 70 || x + TITLE_W <= width; x += TITLE_EVERY) xs.push(x);
  return xs;
}

export function layoutScene(
  input: SceneInput[],
  track: Track,
  opts: { dir?: 'ltr' | 'rtl'; featured?: string } = {}
): SceneLayout {
  const dir = opts.dir ?? 'ltr';
  if (!input.length) {
    return { planes: [], cards: [], beams: [], skills: [], years: [], xRange: [0, 0], start: { x: 0, y: 0, z: 0 } };
  }

  const months = input.map((n) => monthIndex(n.start));
  const m0 = Math.min(...months);
  const m1 = Math.max(...months);
  // Start the timeline at January of the first year so year lines line up.
  const mStart = Math.floor(m0 / 12) * 12;
  const xOfMonth = (m: number) => PAD_START + (m - mStart) * MONTH_W;
  let xEnd = xOfMonth(m1) + PAD_END; // plane spans [0, xEnd]; grows if nudges pass it
  const mirror = (x: number) => (dir === 'rtl' ? xEnd - x : x);

  // ---- cards: true time on x, rows on y to avoid overlaps -----------------
  const cards: SceneCard[] = [];
  for (const layer of LAYERS) {
    const inLayer = input
      .filter((n) => (n.worlds[0] ?? 'origin') === layer)
      .sort((a, b) => monthIndex(a.start) - monthIndex(b.start));
    const rowLast: Record<number, number> = {};
    let prevX = -Infinity;
    for (const n of inLayer) {
      const x = Math.max(xOfMonth(monthIndex(n.start)), prevX + MIN_SEP);
      prevX = x;
      let row = ROWS.find((r) => rowLast[r] === undefined || x - rowLast[r] >= MIN_DX);
      if (row === undefined) {
        // every row is crowded: take the one whose last card is furthest away
        row = ROWS.reduce((best, r) => (x - rowLast[r] > x - rowLast[best] ? r : best), ROWS[0]);
      }
      rowLast[row] = x;
      cards.push({
        slug: n.slug,
        code: n.code,
        layer,
        year: Math.floor(monthIndex(n.start) / 12),
        x,
        y: row,
        z: LAYER_Z[layer],
        dimmed: n.weight[track] === 0,
        featured: n.slug === opts.featured,
      });
    }
  }
  xEnd = Math.max(xEnd, ...cards.map((c) => c.x + PAD_END));
  const totalW = xEnd;
  for (const c of cards) c.x = mirror(c.x);
  const bySlug = new Map(cards.map((c) => [c.slug, c]));

  // ---- beams between connected projects (deduped) -------------------------
  const beams: SceneBeam[] = [];
  const seen = new Set<string>();
  for (const n of input) {
    const a = bySlug.get(n.slug);
    if (!a) continue;
    for (const to of n.connects) {
      const b = bySlug.get(to);
      if (!b) continue;
      const key = [n.slug, to].sort().join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      const pa = { x: a.x, y: a.y, z: a.z };
      const pb = { x: b.x, y: b.y, z: b.z };
      beams.push({ from: n.slug, to, a: pa, b: pb, ...beamGeometry(pa, pb) });
    }
  }

  // ---- skills engraved on the layer where they're used most ---------------
  const skillUse = new Map<string, string[]>();
  for (const n of input) for (const s of n.stack) skillUse.set(s, [...(skillUse.get(s) ?? []), n.slug]);
  type Want = { name: string; layer: Layer; x: number; w: number; slugs: string[] };
  const wants: Want[] = [];
  for (const [name, slugs] of skillUse) {
    const used = slugs.map((s) => bySlug.get(s)!).filter(Boolean);
    if (!used.length) continue;
    const tally: Record<Layer, number> = { mobile: 0, origin: 0, cloud: 0 };
    for (const c of used) tally[c.layer]++;
    const layer = LAYERS.reduce((best, l) => (tally[l] > tally[best] ? l : best), 'origin' as Layer);
    const xs = used.filter((c) => c.layer === layer).map((c) => c.x);
    const x = xs.reduce((s, v) => s + v, 0) / xs.length;
    wants.push({ name, layer, x, w: name.length * SKILL_CHAR_W + SKILL_GAP, slugs });
  }
  // 1-D packing per (layer, band): place in x order, push right on overlap,
  // alternating bands so each skill stays as close to its projects as possible.
  const skills: SceneSkill[] = [];
  for (const layer of LAYERS) {
    const ws = wants.filter((w) => w.layer === layer).sort((a, b) => a.x - b.x);
    const bandEnd: number[] = SKILL_BANDS.map(() => -Infinity);
    for (const w of ws) {
      let bestBand = 0;
      let bestX = Infinity;
      SKILL_BANDS.forEach((_, i) => {
        const x = Math.max(w.x, bandEnd[i] + w.w / 2);
        if (Math.abs(x - w.x) < Math.abs(bestX - w.x)) { bestX = x; bestBand = i; }
      });
      bandEnd[bestBand] = bestX + w.w / 2;
      skills.push({ name: w.name, layer, slugs: w.slugs, x: bestX, y: SKILL_BANDS[bestBand], z: LAYER_Z[layer] });
    }
  }
  // (skills were packed in already-mirrored space, so no further mirror)

  // ---- planes + years ------------------------------------------------------
  const planes: ScenePlane[] = LAYERS.map((layer) => ({
    layer,
    z: LAYER_Z[layer],
    x0: 0,
    width: totalW,
    y0: -PLANE_DEPTH / 2,
    depth: PLANE_DEPTH,
    titleXs: titleStarts(totalW).map(mirror),
  }));
  const years: SceneYear[] = [];
  for (let y = Math.floor(m0 / 12); y <= Math.floor(m1 / 12) + 1; y++) {
    const x = xOfMonth(y * 12);
    if (x <= xEnd) years.push({ year: y, x: mirror(x) });
  }

  const xs = cards.map((c) => c.x);
  const xRange: [number, number] = [Math.min(...xs) - 200, Math.max(...xs) + 200];
  const feat = cards.find((c) => c.featured) ?? cards.find((c) => !c.dimmed) ?? cards[0];
  const start = { x: feat.x, y: 0, z: 0 };

  return { planes, cards, beams, skills, years, xRange, start };
}
