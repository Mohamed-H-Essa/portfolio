// clean.ts — turn raw screenshots into clean PNGs the templates can use.
// - detect device by aspect ratio
// - repaint the top status bar (9:41, full signal/wifi/battery) tinted to the
//   screen's own top-edge colour; this also removes most debug ribbons
// - paint over any `masks` rectangles from shots.yaml
// Output: .cache/<slug>/clean/NN.png
import sharp, { type OverlayOptions } from 'sharp';
import { detectDevice, topEdgeColor, isLight } from './lib.js';

export interface Mask {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Build a clean status-bar SVG overlay sized to the screenshot. */
function statusBarSvg(w: number, barH: number, bg: string, light: boolean): Buffer {
  const fg = light ? '#ffffff' : '#0a0a0a';
  const pad = Math.round(w * 0.055);
  const cy = Math.round(barH * 0.5);
  const fs = Math.round(barH * 0.3);
  // battery/wifi/signal as simple vector glyphs on the right
  const rx = w - pad;
  return Buffer.from(`
<svg width="${w}" height="${barH}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${w}" height="${barH}" fill="${bg}"/>
  <text x="${pad}" y="${cy}" dominant-baseline="central" font-family="-apple-system,SF Pro Text,Helvetica,Arial" font-weight="600" font-size="${fs}" fill="${fg}">9:41</text>
  <g fill="${fg}">
    <!-- signal bars -->
    <rect x="${rx - 150}" y="${cy - fs * 0.25}" width="${fs * 0.18}" height="${fs * 0.5}" rx="1"/>
    <rect x="${rx - 150 + fs * 0.3}" y="${cy - fs * 0.38}" width="${fs * 0.18}" height="${fs * 0.76}" rx="1"/>
    <rect x="${rx - 150 + fs * 0.6}" y="${cy - fs * 0.5}" width="${fs * 0.18}" height="${fs}" rx="1"/>
    <rect x="${rx - 150 + fs * 0.9}" y="${cy - fs * 0.62}" width="${fs * 0.18}" height="${fs * 1.24}" rx="1"/>
    <!-- wifi -->
    <path d="M ${rx - 95} ${cy - fs * 0.1} a ${fs * 0.7} ${fs * 0.7} 0 0 1 ${fs * 1.4} 0" stroke="${fg}" stroke-width="${fs * 0.16}" fill="none"/>
    <path d="M ${rx - 95 + fs * 0.25} ${cy + fs * 0.15} a ${fs * 0.42} ${fs * 0.42} 0 0 1 ${fs * 0.9} 0" stroke="${fg}" stroke-width="${fs * 0.16}" fill="none"/>
    <circle cx="${rx - 95 + fs * 0.7}" cy="${cy + fs * 0.42}" r="${fs * 0.1}"/>
    <!-- battery -->
    <rect x="${rx - 40}" y="${cy - fs * 0.35}" width="${fs * 1.5}" height="${fs * 0.7}" rx="${fs * 0.15}" fill="none" stroke="${fg}" stroke-width="${fs * 0.1}"/>
    <rect x="${rx - 40 + fs * 0.12}" y="${cy - fs * 0.23}" width="${fs * 1.0}" height="${fs * 0.46}" rx="${fs * 0.08}"/>
    <rect x="${rx - 40 + fs * 1.55}" y="${cy - fs * 0.15}" width="${fs * 0.12}" height="${fs * 0.3}" rx="1"/>
  </g>
</svg>`);
}

export async function cleanScreenshot(input: Buffer, masks: Mask[] = []): Promise<Buffer> {
  const img = sharp(input).rotate(); // honour EXIF
  const meta = await img.metadata();
  const w = meta.width!;
  const h = meta.height!;
  const dev = detectDevice(w, h);

  const composites: OverlayOptions[] = [];

  // 1. clean status bar (phones only)
  if (dev.statusFrac > 0) {
    const barH = Math.round(h * dev.statusFrac);
    const bg = await topEdgeColor(input);
    const bar = statusBarSvg(w, barH, bg, isLight(bg));
    composites.push({ input: bar, top: 0, left: 0 });
  }

  // 2. masks — fill each rect with the screen's top-edge colour as a neutral patch.
  //    (A per-rect neighbour sample would be nicer; top-edge is a safe default
  //    for debug ribbons that sit in a solid header.)
  if (masks.length) {
    const fill = await topEdgeColor(input);
    for (const m of masks) {
      const rect = Buffer.from(
        `<svg width="${m.w}" height="${m.h}" xmlns="http://www.w3.org/2000/svg"><rect width="${m.w}" height="${m.h}" fill="${fill}"/></svg>`
      );
      composites.push({ input: rect, top: m.y, left: m.x });
    }
  }

  return sharp(input)
    .rotate()
    .composite(composites)
    .png()
    .toBuffer();
}
