// Pure timeline layout. Maps project nodes to {x,y} on a time×lane plane.
// x = time (start month), lane = primary world. No DOM, no side effects — unit
// tested. The Timeline island renders these coords; the SSR list ignores them.
import type { Track } from '../i18n/config';

export type Lane = 'mobile' | 'origin' | 'cloud';

export interface TLInput {
  slug: string;
  code: string;
  start: string; // YYYY-MM
  worlds: ('mobile' | 'cloud' | 'origin')[];
  weight: Record<Track, number>;
  connects: string[];
}

export interface TLNode {
  slug: string;
  code: string;
  x: number;
  y: number;
  lane: Lane;
  dimmed: boolean;
}

export interface TLEdge {
  from: string;
  to: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface TLLayout {
  nodes: TLNode[];
  edges: TLEdge[];
  width: number;
  height: number;
  /** year → x, for axis ticks */
  years: { year: number; x: number }[];
  lanes: { lane: Lane; y: number }[];
}

const LANE_ORDER: Lane[] = ['mobile', 'origin', 'cloud'];
const LANE_GAP = 200;
const LANE_TOP = 120;
const PAD_X = 160;
const MONTH_W = 26; // px per month
const NODE_MIN_GAP = 190; // min x spacing between nodes in the same lane (room for titles)

function months(start: string): number {
  const [y, m] = start.split('-').map(Number);
  return y * 12 + (m - 1);
}

function primaryLane(worlds: TLInput['worlds']): Lane {
  // first world wins; map to a lane
  return (worlds[0] ?? 'origin') as Lane;
}

/**
 * Lay out nodes. `dir` 'rtl' mirrors x so time flows right→left.
 */
export function layoutTimeline(input: TLInput[], track: Track, dir: 'ltr' | 'rtl' = 'ltr'): TLLayout {
  if (!input.length) {
    return { nodes: [], edges: [], width: 800, height: 600, years: [], lanes: [] };
  }
  const monthVals = input.map((n) => months(n.start));
  const minMonth = Math.min(...monthVals);
  const maxMonth = Math.max(...monthVals);

  const rawWidth = PAD_X * 2 + (maxMonth - minMonth) * MONTH_W;
  const width = Math.max(800, rawWidth);
  const height = LANE_TOP + LANE_ORDER.length * LANE_GAP;

  const xOf = (start: string): number => {
    const x = PAD_X + (months(start) - minMonth) * MONTH_W;
    return dir === 'rtl' ? width - x : x;
  };

  // place nodes, then nudge within a lane to avoid x-collisions
  const byLane: Record<Lane, TLInput[]> = { mobile: [], origin: [], cloud: [] };
  for (const n of input) byLane[primaryLane(n.worlds)].push(n);

  const nodes: TLNode[] = [];
  const posBySlug = new Map<string, { x: number; y: number }>();

  for (const lane of LANE_ORDER) {
    const laneY = LANE_TOP + LANE_ORDER.indexOf(lane) * LANE_GAP;
    const sorted = [...byLane[lane]].sort((a, b) => months(a.start) - months(b.start));
    let lastX = dir === 'rtl' ? Infinity : -Infinity;
    for (const n of sorted) {
      let x = xOf(n.start);
      if (dir === 'ltr' && x - lastX < NODE_MIN_GAP) x = lastX + NODE_MIN_GAP;
      if (dir === 'rtl' && lastX - x < NODE_MIN_GAP) x = lastX - NODE_MIN_GAP;
      lastX = x;
      const node: TLNode = {
        slug: n.slug,
        code: n.code,
        x,
        y: laneY,
        lane,
        dimmed: n.weight[track] === 0,
      };
      nodes.push(node);
      posBySlug.set(n.slug, { x, y: laneY });
    }
  }

  const edges: TLEdge[] = [];
  const seen = new Set<string>();
  for (const n of input) {
    const a = posBySlug.get(n.slug);
    if (!a) continue;
    for (const to of n.connects) {
      const b = posBySlug.get(to);
      if (!b) continue;
      const key = [n.slug, to].sort().join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ from: n.slug, to, x1: a.x, y1: a.y, x2: b.x, y2: b.y });
    }
  }

  // year ticks
  const years: { year: number; x: number }[] = [];
  const startYear = Math.floor(minMonth / 12);
  const endYear = Math.floor(maxMonth / 12);
  for (let y = startYear; y <= endYear; y++) {
    years.push({ year: y, x: xOf(`${y}-01`) });
  }

  const lanes = LANE_ORDER.map((lane) => ({ lane, y: LANE_TOP + LANE_ORDER.indexOf(lane) * LANE_GAP }));

  return { nodes, edges, width, height, years, lanes };
}
