// Site identity assets, generated from the same ∞ geometry as the intro:
//   public/favicon.svg, favicon.ico (16+32+48), apple-touch-icon.png (180),
//   icon-192.png, icon-512.png, icon-maskable-512.png, site.webmanifest,
//   public/og/<lang>-<track>.jpg (1200×630 link previews, one per page family).
// Run: npm run brand   (outputs are committed; re-run after changing copy/colours)

import { chromium } from 'playwright';
import sharp from 'sharp';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathD } from '../src/lib/lemniscate.js';

const ROOT = process.cwd();
const PUB = join(ROOT, 'public');
const C = { bg: '#080808', tile: '#0d0d0f', mobile: '#e8b23a', origin: '#ede6d6', cloud: '#5db8d6', ink: '#ededed', ink2: '#9a9a9a' };
const D = pathD(100, 360);
// the address printed on link previews (same default as astro.config.mjs)
const HOST = new URL(process.env.SITE_URL ?? 'https://mohamed-h-essa.github.io').host;

const grad = (id: string, x1: number, x2: number) =>
  `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${x1}" y1="0" x2="${x2}" y2="0">` +
  `<stop offset="0" stop-color="${C.mobile}"/><stop offset=".5" stop-color="${C.origin}"/><stop offset="1" stop-color="${C.cloud}"/></linearGradient>`;

/** The mark: the ∞ on a dark tile. `bleed` = full-square tile with the loop in the safe zone (maskable). */
function markSvg(bleed = false): string {
  const k = bleed ? 0.19 : 0.245; // loop width ≈ 76% (normal) / 60% (maskable) of the tile
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>${grad('g', -100, 100)}</defs>
  <rect width="64" height="64" ${bleed ? '' : 'rx="14"'} fill="${C.tile}"/>
  <g transform="translate(32 32) scale(${k})" fill="none" stroke="url(#g)" stroke-linecap="round">
    <path d="${D}" stroke-width="${(bleed ? 4.2 : 5.2) / k}" opacity=".28"/>
    <path d="${D}" stroke-width="${(bleed ? 2.6 : 3.4) / k}"/>
  </g>
</svg>`;
}

/** ICO container with PNG payloads (supported by every browser that reads .ico). */
function ico(pngs: { size: number; buf: Buffer }[]): Buffer {
  const head = Buffer.alloc(6 + 16 * pngs.length);
  head.writeUInt16LE(0, 0);
  head.writeUInt16LE(1, 2);
  head.writeUInt16LE(pngs.length, 4);
  let offset = head.length;
  pngs.forEach((p, i) => {
    const o = 6 + i * 16;
    head.writeUInt8(p.size >= 256 ? 0 : p.size, o);
    head.writeUInt8(p.size >= 256 ? 0 : p.size, o + 1);
    head.writeUInt16LE(1, o + 4); // planes
    head.writeUInt16LE(32, o + 6); // bpp
    head.writeUInt32LE(p.buf.length, o + 8);
    head.writeUInt32LE(offset, o + 12);
    offset += p.buf.length;
  });
  return Buffer.concat([head, ...pngs.map((p) => p.buf)]);
}

async function icons() {
  const svg = markSvg();
  writeFileSync(join(PUB, 'favicon.svg'), svg);
  const png = (s: string, size: number) => sharp(Buffer.from(s), { density: 72 * (size / 64) * 2 }).resize(size, size).png().toBuffer();
  const small = await Promise.all([16, 32, 48].map(async (size) => ({ size, buf: await png(svg, size) })));
  writeFileSync(join(PUB, 'favicon.ico'), ico(small));
  writeFileSync(join(PUB, 'apple-touch-icon.png'), await png(markSvg(true), 180)); // iOS rounds the corners itself
  writeFileSync(join(PUB, 'icon-192.png'), await png(svg, 192));
  writeFileSync(join(PUB, 'icon-512.png'), await png(svg, 512));
  writeFileSync(join(PUB, 'icon-maskable-512.png'), await png(markSvg(true), 512));
  writeFileSync(
    join(PUB, 'site.webmanifest'),
    JSON.stringify(
      {
        name: 'Mohamed Essa — Mobile & Cloud Engineer',
        short_name: 'Mohamed Essa',
        start_url: '/',
        display: 'standalone',
        background_color: C.bg,
        theme_color: C.bg,
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      null,
      2
    ) + '\n'
  );
  console.log('  ✓ icons + manifest');
}

// ---- link previews ----------------------------------------------------------
const font = (pkg: string, file: string) =>
  `url(data:font/woff2;base64,${readFileSync(join(ROOT, 'node_modules/@fontsource', pkg, 'files', file)).toString('base64')}) format('woff2')`;
const FONTS = `
@font-face{font-family:SG;font-weight:600;src:${font('space-grotesk', 'space-grotesk-latin-600-normal.woff2')}}
@font-face{font-family:SG;font-weight:700;src:${font('space-grotesk', 'space-grotesk-latin-700-normal.woff2')}}
@font-face{font-family:JB;font-weight:500;src:${font('jetbrains-mono', 'jetbrains-mono-latin-500-normal.woff2')}}
@font-face{font-family:TJ;font-weight:500;src:${font('tajawal', 'tajawal-arabic-500-normal.woff2')}}
@font-face{font-family:TJ;font-weight:700;src:${font('tajawal', 'tajawal-arabic-700-normal.woff2')}}`;

function ogHtml(lang: string, track: string, t: Record<string, string>): string {
  const rtl = lang === 'ar';
  const accent = track === 'mobile' ? C.mobile : track === 'cloud' ? C.cloud : C.origin;
  const display = rtl ? "TJ, SG, sans-serif" : 'SG, sans-serif';
  return `<!doctype html><html dir="${rtl ? 'rtl' : 'ltr'}"><head><style>${FONTS}
  *{margin:0;box-sizing:border-box}
  body{width:1200px;height:630px;background:radial-gradient(70% 80% at ${rtl ? '28%' : '72%'} 45%,#141518,${C.bg} 70%);color:${C.ink};font-family:${display};position:relative;overflow:hidden}
  .inf{position:absolute;top:165px;${rtl ? 'left' : 'right'}:30px;width:540px;height:295px}
  .copy{position:absolute;${rtl ? 'right' : 'left'}:80px;top:120px;width:520px;display:grid;gap:18px}
  .world{font-family:${rtl ? 'TJ' : 'JB'},monospace;font-size:22px;letter-spacing:${rtl ? 0 : '.2em'};text-transform:uppercase;color:${accent}}
  h1{font-size:62px;white-space:nowrap;font-weight:700;line-height:1;letter-spacing:-.01em}
  h2{font-size:38px;font-weight:600;line-height:1.15;color:${C.ink}}
  p{font-size:25px;line-height:1.4;color:${C.ink2}}
  .url{position:absolute;${rtl ? 'right' : 'left'}:80px;bottom:56px;font-family:JB,monospace;font-size:22px;letter-spacing:.12em;color:${C.ink2};direction:ltr}
  </style></head><body>
  <svg class="inf" viewBox="-110 -60 220 120"><defs>${grad('g', -100, 100)}<filter id="b"><feGaussianBlur stdDeviation="2.6"/></filter></defs>
    <path d="${D}" fill="none" stroke="url(#g)" stroke-width="3.4" opacity=".45" filter="url(#b)"/>
    <path d="${D}" fill="none" stroke="url(#g)" stroke-width="1.1"/>
  </svg>
  <div class="copy">
    <div class="world">${t[`world.${track}.name`]}</div>
    <h1>Mohamed Essa</h1>
    <h2>${t[`track.${track}.hero`]}</h2>
    <p>${t[`track.${track}.sub`]}</p>
  </div>
  <div class="url">${HOST}</div>
  </body></html>`;
}

async function og() {
  mkdirSync(join(PUB, 'og'), { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  for (const lang of ['en', 'de', 'ar']) {
    const t = JSON.parse(readFileSync(join(ROOT, 'src/i18n', `${lang}.json`), 'utf8')) as Record<string, string>;
    const en = JSON.parse(readFileSync(join(ROOT, 'src/i18n/en.json'), 'utf8')) as Record<string, string>;
    const tt = new Proxy(t, { get: (o, k: string) => o[k] ?? en[k] ?? '' });
    for (const track of ['mobile', 'cloud', 'all']) {
      await page.setContent(ogHtml(lang, track, tt), { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      const shot = await page.screenshot({ type: 'png' });
      await sharp(shot).jpeg({ quality: 86, mozjpeg: true }).toFile(join(PUB, 'og', `${lang}-${track}.jpg`));
    }
  }
  await browser.close();
  console.log('  ✓ 9 link previews');
}

await icons();
await og();
console.log('brand done.');
