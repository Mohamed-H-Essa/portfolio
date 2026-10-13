// Pure layout for the 3D map. Produces world-space coordinates (px) for:
// three lanes lying side by side on one floor (mobile / platform / cloud),
// project cards that stand on their lane, beams between connected projects,
// skills engraved along the lane edges, and year lines across all lanes.
//
// Axes (world space, before the camera): x = across the lanes, y = time
// (older = smaller y = further away, so the past recedes and the present is
// close), z = up. The Scene component renders these with CSS 3D; the camera
// script only moves the camera, never the layout. No DOM here — tested.
//
// Time runs top → bottom in every language; RTL only mirrors the lane order.
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
  x0: number; // inline edge of the lane (physical left)
  width: number; // across the lane
  y0: number; // top (the far, oldest end)
  depth: number; // along time
  /** lane centre on x (camera snaps here on phones) */
  cx: number;
  /** y positions of the engraved lane name, in stretches no card covers */
  titleYs: number[];
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
export interface SceneYear { year: number; y: number }

export interface SceneLayout {
  planes: ScenePlane[];
  cards: SceneCard[];
  beams: SceneBeam[];
  skills: SceneSkill[];
  years: SceneYear[];
  /** x of the year axis (beside the lanes, on the inline-start side) */
  axisX: number;
  /** camera clamp ranges for the focus */
  xRange: [number, number];
  yRange: [number, number];
  /** where the camera should start (x = middle of all lanes) */
  start: Vec3;
}

export const LAYERS: Layer[] = ['mobile', 'origin', 'cloud'];
export const LANE_W = 380;
export const LANE_GAP = 90;
export const AXIS_GAP = 110; // year labels sit this far outside the first lane
export const CARD_LIFT = 46; // how high a card floats above its lane
const MONTH_H = 70; // px per month on the time axis
const PAD_START = 420; // room before the first card for the lane names
const PAD_END = 420;
/** Cards zig-zag between two columns in a lane (offset from the lane centre). */
export const COL = 90;
/** Consecutive cards in a lane are at least this far apart in time (y), so
 *  their dots never touch and reading order stays clear. */
export const MIN_SEP = 120;
/** Cards in the SAME column must be this far apart: a billboard rises from its
 *  anchor and covers ~this much floor behind it at the default zoom. */
export const MIN_DY = 340;
/** Skills are engraved along both edges of a lane (offset from its centre). */
export const SKILL_EDGE = 166;
export const SKILL_CHAR_W = 12.5; // approx. advance per char of the engraved skill font
export const SKILL_GAP = 34;
const YEAR_H = 12 * MONTH_H;
const TITLE_CLEAR_ABOVE = 90; // a lane name keeps this far below the card above it
const TITLE_CLEAR_BELOW = 380; // ...and this far above the next card (its billboard covers it)

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

export function layoutScene(
  input: SceneInput[],
  track: Track,
  opts: { dir?: 'ltr' | 'rtl'; featured?: string } = {}
): SceneLayout {
  const dir = opts.dir ?? 'ltr';
  if (!input.length) {
    return {
      planes: [], cards: [], beams: [], skills: [], years: [], axisX: 0,
      xRange: [0, 0], yRange: [0, 0], start: { x: 0, y: 0, z: 0 },
    };
  }

  // ---- lanes: side by side on x, mirrored in RTL -----------------------------
  const order = dir === 'rtl' ? [...LAYERS].reverse() : LAYERS;
  const laneX0 = (l: Layer) => order.indexOf(l) * (LANE_W + LANE_GAP);
  const laneCx = (l: Layer) => laneX0(l) + LANE_W / 2;
  const spanW = LAYERS.length * LANE_W + (LAYERS.length - 1) * LANE_GAP;
  const axisX = dir === 'rtl' ? spanW + AXIS_GAP : -AXIS_GAP;
  // the column on the inline-start side of a lane comes first in the zig-zag
  const cols = dir === 'rtl' ? [COL, -COL] : [-COL, COL];

  const months = input.map((n) => monthIndex(n.start));
  const m0 = Math.min(...months);
  const m1 = Math.max(...months);
  // Start the timeline at January of the first year so year lines line up.
  const mStart = Math.floor(m0 / 12) * 12;
  const yOfMonth = (m: number) => PAD_START + (m - mStart) * MONTH_H;

  // ---- cards: true time on y, zig-zag columns, nudged later only if crowded --
  const cards: SceneCard[] = [];
  for (const layer of LAYERS) {
    const inLayer = input
      .filter((n) => (n.worlds[0] ?? 'origin') === layer)
      .sort((a, b) => monthIndex(a.start) - monthIndex(b.start));
    const colLast = cols.map(() => -Infinity);
    let prevY = -Infinity;
    let prevCol = -1;
    for (const n of inLayer) {
      const base = Math.max(yOfMonth(monthIndex(n.start)), prevY + MIN_SEP);
      // each column's earliest free y; take the earliest, alternating on a tie
      const ys = cols.map((_, i) => Math.max(base, colLast[i] + MIN_DY));
      let col = ys[0] < ys[1] ? 0 : ys[1] < ys[0] ? 1 : prevCol === 0 ? 1 : 0;
      const y = ys[col];
      colLast[col] = y;
      prevY = y;
      prevCol = col;
      cards.push({
        slug: n.slug,
        code: n.code,
        layer,
        year: Math.floor(monthIndex(n.start) / 12),
        x: laneCx(layer) + cols[col],
        y,
        z: 0,
        dimmed: n.weight[track] === 0,
        featured: n.slug === opts.featured,
      });
    }
  }
  const yEnd = Math.max(yOfMonth(m1), ...cards.map((c) => c.y)) + PAD_END;
  const bySlug = new Map(cards.map((c) => [c.slug, c]));

  // ---- beams between connected projects (deduped), lying on the floor ------
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
      const pa = { x: a.x, y: a.y, z: 0 };
      const pb = { x: b.x, y: b.y, z: 0 };
      beams.push({ from: n.slug, to, a: pa, b: pb, ...beamGeometry(pa, pb) });
    }
  }

  // ---- skills engraved along the edges of the lane that uses them most -----
  const skillUse = new Map<string, string[]>();
  for (const n of input) for (const s of n.stack) skillUse.set(s, [...(skillUse.get(s) ?? []), n.slug]);
  type Want = { name: string; layer: Layer; y: number; h: number; slugs: string[] };
  const wants: Want[] = [];
  for (const [name, slugs] of skillUse) {
    const used = slugs.map((s) => bySlug.get(s)!).filter(Boolean);
    if (!used.length) continue;
    const tally: Record<Layer, number> = { mobile: 0, origin: 0, cloud: 0 };
    for (const c of used) tally[c.layer]++;
    const layer = LAYERS.reduce((best, l) => (tally[l] > tally[best] ? l : best), 'origin' as Layer);
    const ys = used.filter((c) => c.layer === layer).map((c) => c.y);
    const y = ys.reduce((s, v) => s + v, 0) / ys.length;
    wants.push({ name, layer, y, h: name.length * SKILL_CHAR_W + SKILL_GAP, slugs });
  }
  // 1-D packing per (lane, edge) along time: place in y order, push later on
  // overlap, choosing the edge that keeps each skill closest to its projects.
  const skills: SceneSkill[] = [];
  const edges = [-SKILL_EDGE, SKILL_EDGE];
  for (const layer of LAYERS) {
    const ws = wants.filter((w) => w.layer === layer).sort((a, b) => a.y - b.y || a.name.localeCompare(b.name));
    const edgeEnd = edges.map(() => -Infinity);
    for (const w of ws) {
      let best = 0;
      let bestY = Infinity;
      edges.forEach((_, i) => {
        const y = Math.max(w.y, edgeEnd[i] + w.h / 2);
        if (Math.abs(y - w.y) < Math.abs(bestY - w.y)) { bestY = y; best = i; }
      });
      edgeEnd[best] = bestY + w.h / 2;
      skills.push({ name: w.name, layer, slugs: w.slugs, x: laneCx(layer) + edges[best], y: bestY, z: 0 });
    }
  }

  // ---- years + lane names --------------------------------------------------
  const years: SceneYear[] = [];
  for (let yr = Math.floor(m0 / 12); yr <= Math.floor(m1 / 12) + 1; yr++) {
    const y = yOfMonth(yr * 12);
    if (y <= yEnd) years.push({ year: yr, y });
  }
  // A lane name goes in the lead-in, then every half year wherever no card's
  // billboard stands over it and it keeps clear of the year lines.
  const titleYsFor = (layer: Layer) => {
    const own = cards.filter((c) => c.layer === layer).map((c) => c.y);
    const clear = (y: number) =>
      own.every((cy) => y - cy >= TITLE_CLEAR_ABOVE || cy - y >= TITLE_CLEAR_BELOW) &&
      years.every((yr) => Math.abs(yr.y - y) >= 60);
    const out = [PAD_START / 2];
    for (let y = PAD_START + YEAR_H / 4; y < yEnd - 80; y += YEAR_H / 2) {
      if (clear(y) && y - out[out.length - 1] >= YEAR_H / 2 - 1) out.push(y);
    }
    return out;
  };

  const planes: ScenePlane[] = LAYERS.map((layer) => ({
    layer,
    x0: laneX0(layer),
    width: LANE_W,
    y0: 0,
    depth: yEnd,
    cx: laneCx(layer),
    titleYs: titleYsFor(layer),
  }));

  const cys = cards.map((c) => c.y);
  const xRange: [number, number] = [laneCx(order[0]) - 60, laneCx(order[order.length - 1]) + 60];
  const yRange: [number, number] = [Math.min(...cys) - 260, Math.max(...cys) + 160];
  const feat = cards.find((c) => c.featured) ?? cards.find((c) => !c.dimmed) ?? cards[0];
  const start = { x: spanW / 2, y: feat.y, z: 0 };

  return { planes, cards, beams, skills, years, axisX, xRange, yRange, start };
}
