// Shared helpers for the asset pipeline: device profiles, accent sampling,
// status-bar replacement, and the Dark "ground" CSS used by every template.
import sharp from 'sharp';

export const WORLD_ACCENT = {
  mobile: '#e8b23a',
  cloud: '#5db8d6',
  origin: '#ede6d6',
} as const;

export type DeviceKind = 'iphone' | 'android' | 'web';

export interface DeviceProfile {
  kind: DeviceKind;
  /** corner radius as a fraction of width, for the rounded screen mask */
  radiusFrac: number;
  /** status-bar height as a fraction of height (where we repaint a clean bar) */
  statusFrac: number;
}

/** Pick a device profile from a screenshot's pixel dimensions. */
export function detectDevice(w: number, h: number): DeviceProfile {
  const ar = h / w;
  if (ar > 1.9) {
    // tall phone (iPhone 1206x2622 ar~2.17, Max 1320x2868 ar~2.17, 1242x2688 ar~2.16)
    return { kind: 'iphone', radiusFrac: 0.09, statusFrac: 0.062 };
  }
  if (ar > 1.3) return { kind: 'android', radiusFrac: 0.05, statusFrac: 0.04 };
  return { kind: 'web', radiusFrac: 0.012, statusFrac: 0 };
}

/** Sample a saturated, screen-glowing accent from an image buffer. */
export async function sampleAccent(buf: Buffer): Promise<string> {
  // Downscale hard, then read raw pixels and pick the most saturated,
  // mid-light colour (quantised). Falls back to a world accent by the caller.
  const { data, info } = await sharp(buf)
    .resize(48, 48, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const buckets = new Map<string, { n: number; r: number; g: number; b: number; score: number }>();
  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2 / 255;
    const s = max === min ? 0 : (max - min) / (255 - Math.abs(max + min - 255));
    if (l < 0.22 || l > 0.82) continue; // skip near-black / near-white
    if (s < 0.25) continue; // skip greys
    const key = `${r >> 5}-${g >> 5}-${b >> 5}`;
    const cur = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0, score: 0 };
    cur.n++; cur.r += r; cur.g += g; cur.b += b; cur.score += s;
    buckets.set(key, cur);
  }
  let best: { r: number; g: number; b: number } | null = null;
  let bestScore = 0;
  for (const v of buckets.values()) {
    const weight = v.score; // saturation * frequency
    if (weight > bestScore) {
      bestScore = weight;
      best = { r: Math.round(v.r / v.n), g: Math.round(v.g / v.n), b: Math.round(v.b / v.n) };
    }
  }
  if (!best) return '';
  // clamp lightness into a glow-friendly band
  return clampForGlow(best.r, best.g, best.b);
}

function clampForGlow(r: number, g: number, b: number): string {
  // convert to HSL, clamp L to 0.55–0.65, S to >=0.5
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  let h = 0;
  const l = (max + min) / 2;
  const d = max - min;
  let s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  s = Math.max(0.5, s);
  const L = Math.min(0.65, Math.max(0.55, l));
  return hslToHex(h, s, L);
}

function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const to = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

/** Luminance of a hex colour, for deciding light vs dark status-bar glyphs. */
export function isLight(hex: string): boolean {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 140;
}

/** Median colour of the top edge of an image — used to tint the clean status bar. */
export async function topEdgeColor(buf: Buffer): Promise<string> {
  const { data, info } = await sharp(buf)
    .extract({ left: 0, top: 0, width: (await sharp(buf).metadata()).width!, height: 40 })
    .resize(20, 4)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
  }
  const to = (v: number) => Math.round(v / n).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}
