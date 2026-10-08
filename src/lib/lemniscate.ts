// Geometry of the intro's ∞: a lemniscate of Bernoulli with fuller lobes
// (y stretched) so world labels fit inside them. Right lobe = Cloud, left
// lobe = Mobile, the crossing = Both. t runs continuously; the crossing is at
// t = ±π/2 (mod 2π). Pure, shared by the SSR path and the canvas light.

export type Lobe = 'mobile' | 'cloud';
export const FULL = 1.42; // y stretch: Bernoulli's lobes are thin for labels
const TAU = Math.PI * 2;

/** Parameter range of each lobe, crossing to crossing (normalised t). */
export const LOBE: Record<Lobe, [number, number]> = {
  cloud: [-Math.PI / 2, Math.PI / 2],
  mobile: [Math.PI / 2, (3 * Math.PI) / 2],
};

export function point(t: number, a: number): { x: number; y: number } {
  const s = Math.sin(t), c = Math.cos(t);
  const k = a / (1 + s * s);
  return { x: k * c, y: k * s * c * FULL };
}

/** t mapped into [-π/2, 3π/2). */
function norm(t: number): number {
  return ((((t + Math.PI / 2) % TAU) + TAU) % TAU) - Math.PI / 2;
}

export function lobeOf(t: number): Lobe {
  return norm(t) < Math.PI / 2 ? 'cloud' : 'mobile';
}

/** Keep an orbit inside one lobe: when t steps just past the lobe's end
 *  (back at the crossing), jump back to its start — the same point, so the
 *  light never visibly jumps. Outside the lobe t is left alone, so the light
 *  travels on until it enters the lobe naturally. */
export function confine(t: number, lobe: Lobe, slack = 0.6): number {
  const n = norm(t);
  const end = LOBE[lobe][1];
  const past = ((n - end + TAU) % TAU);
  return past < slack ? t - Math.PI : t;
}

/** SVG path for the whole ∞, starting at the crossing. */
export function pathD(a: number, steps = 240): string {
  let d = '';
  for (let i = 0; i <= steps; i++) {
    const p = point(-Math.PI / 2 + (i / steps) * TAU, a);
    d += `${i ? 'L' : 'M'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
  }
  return d + 'Z';
}
