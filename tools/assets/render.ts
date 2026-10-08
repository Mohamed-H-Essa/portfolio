// render.ts — the asset pipeline entry point.
//   npm run assets            → every project under assets-src/
//   npm run assets -- aratc   → one project
//
// For a screenshot project it expects:
//   assets-src/<slug>/raw/*            source screenshots
//   assets-src/<slug>/shots.yaml       { device?, accent?, shots:[{file, role, caption?, masks?}] }
// For a code/cloud project it expects:
//   assets-src/<slug>/diagram.yaml     { accent?, title, code, diagram:{nodes, edges} }
//
// Output (committed): public/projects/<slug>/{cover,cover-portrait,thumb,sigil.svg,og/<lang>.png,gallery/NN.webp}
import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, resolve, extname } from 'node:path';
import { parse as parseYaml } from 'yaml';
import sharp from 'sharp';
import { chromium, type Browser } from 'playwright';
import { cleanScreenshot, type Mask } from './clean.js';
import {
  coverTemplate,
  coverPortraitTemplate,
  thumbTemplate,
  galleryTemplate,
  cloudCoverTemplate,
  type Screen,
} from './templates.js';
import { sampleAccent, WORLD_ACCENT } from './lib.js';
import { sigilSvg } from './sigil.js';

const ROOT = resolve(import.meta.dirname, '../..');
const SRC = join(ROOT, 'assets-src');
const OUT = join(ROOT, 'public/projects');

interface ShotSpec {
  file: string;
  role: 'hero' | 'gallery';
  caption?: Record<string, string>;
  masks?: Mask[];
}
interface ShotsYaml {
  device?: string;
  accent?: string;
  world?: keyof typeof WORLD_ACCENT;
  title?: string;
  code?: string;   // Dark-style case code for the cover caption, e.g. "M02"
  impact?: string; // one-line impact for the cover caption (English)
  /** the shots are finished store frames (device + marketing text already in
   *  the image): gallery only, shown as-is; the site uses a Badge for the art */
  framed?: boolean;
  shots: ShotSpec[];
}
interface DiagramYaml {
  accent?: string;
  world?: keyof typeof WORLD_ACCENT;
  title: string;
  code: string;
  diagram: { nodes: string[]; edges: [number, number][] };
}

async function toScreen(buf: Buffer): Promise<Screen> {
  const meta = await sharp(buf).metadata();
  return { dataUri: `data:image/png;base64,${buf.toString('base64')}`, w: meta.width!, h: meta.height! };
}

async function shoot(browser: Browser, html: string, w: number, h: number, scale = 1): Promise<Buffer> {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: scale });
  await page.setContent(html, { waitUntil: 'networkidle' });
  const el = await page.$('.stage');
  const buf = await (el ?? page).screenshot({ type: 'png' });
  await page.close();
  return buf as Buffer;
}

async function writeWebp(buf: Buffer, path: string, quality = 78) {
  await sharp(buf).webp({ quality }).toFile(path);
}

async function renderFramedProject(slug: string, spec: ShotsYaml) {
  const raw = join(SRC, slug, 'raw');
  const outDir = join(OUT, slug);
  const galDir = join(outDir, 'gallery');
  mkdirSync(galDir, { recursive: true });
  const first = readFileSync(join(raw, spec.shots[0].file));
  let accent = spec.accent && spec.accent !== 'auto' ? spec.accent : '';
  if (!accent) accent = await sampleAccent(first);
  if (!accent) accent = WORLD_ACCENT[spec.world ?? 'mobile'];
  let i = 1;
  for (const sh of spec.shots) {
    const n = String(i++).padStart(2, '0');
    for (const [k, suffix] of [[1, ''], [2, '-2x']] as const) {
      await sharp(readFileSync(join(raw, sh.file)))
        .resize(720 * k, 1091 * k, { fit: 'contain', background: '#0b0c0e' })
        .webp({ quality: 80 })
        .toFile(join(galDir, `${n}${suffix}.webp`));
    }
  }
  writeMeta(outDir, accent);
  console.log(`  ✓ ${slug} (store frames, gallery only) accent=${accent} galleries=${i - 1}`);
}

async function renderScreenshotProject(browser: Browser, slug: string, spec: ShotsYaml) {
  if (spec.framed) return renderFramedProject(slug, spec);
  const raw = join(SRC, slug, 'raw');
  const outDir = join(OUT, slug);
  const galDir = join(outDir, 'gallery');
  mkdirSync(galDir, { recursive: true });

  const heroSpec = spec.shots.find((s) => s.role === 'hero') ?? spec.shots[0];
  const gallerySpecs = spec.shots.filter((s) => s.role === 'gallery');

  const cleanOf = async (sp: ShotSpec) =>
    cleanScreenshot(readFileSync(join(raw, sp.file)), sp.masks ?? []);

  const heroClean = await cleanOf(heroSpec);
  const hero = await toScreen(heroClean);

  // accent: explicit > sampled > world default
  let accent = spec.accent && spec.accent !== 'auto' ? spec.accent : '';
  if (!accent) accent = await sampleAccent(heroClean);
  if (!accent) accent = WORLD_ACCENT[spec.world ?? 'mobile'];

  const title = spec.title ?? slug;
  const sigil = sigilSvg(slug, title, accent);
  writeFileSync(join(outDir, 'sigil.svg'), sigil);

  const backScreens: Screen[] = [];
  for (const gs of gallerySpecs.slice(0, 2)) backScreens.push(await toScreen(await cleanOf(gs)));

  // UI covers carry NO baked-in text: the page renders the title in HTML over
  // the empty side. LTR puts the devices right; RTL mirrors them left.
  const cv = coverTemplate(hero, backScreens, { accent, sigilSvg: sigil });
  await writeWebp(await shoot(browser, cv.html, cv.w, cv.h), join(outDir, 'cover.webp'), 80);
  const cvr = coverTemplate(hero, backScreens, { accent, sigilSvg: sigil, rtl: true });
  await writeWebp(await shoot(browser, cvr.html, cvr.w, cvr.h), join(outDir, 'cover-rtl.webp'), 80);

  // The captioned variant is for link previews (OG), where there is no HTML.
  if (spec.code) {
    const og = coverTemplate(hero, backScreens, { accent, sigilSvg: sigil }, { code: spec.code, title, impact: spec.impact });
    await sharp(await shoot(browser, og.html, og.w, og.h)).resize(1200, 675).png().toFile(join(outDir, 'og.png'));
  }

  const cp = coverPortraitTemplate(hero, { accent, sigilSvg: sigil });
  await writeWebp(await shoot(browser, cp.html, cp.w, cp.h), join(outDir, 'cover-portrait.webp'), 80);

  const th = thumbTemplate(hero, { accent });
  await writeWebp(await shoot(browser, th.html, th.w, th.h), join(outDir, 'thumb.webp'), 80);

  let i = 1;
  for (const gs of [heroSpec, ...gallerySpecs]) {
    const sc = await toScreen(await cleanOf(gs));
    const gl = galleryTemplate(sc, { accent });
    await writeWebp(await shoot(browser, gl.html, gl.w, gl.h), join(galDir, `${String(i).padStart(2, '0')}.webp`), 78);
    // 2× for the full-screen viewer (loaded only there)
    await writeWebp(await shoot(browser, gl.html, gl.w, gl.h, 2), join(galDir, `${String(i).padStart(2, '0')}-2x.webp`), 80);
    i++;
  }

  writeMeta(outDir, accent);
  console.log(`  ✓ ${slug} (screenshots) accent=${accent} galleries=${i - 1}`);
}

async function renderCloudProject(browser: Browser, slug: string, spec: DiagramYaml) {
  const outDir = join(OUT, slug);
  mkdirSync(outDir, { recursive: true });
  const accent = spec.accent && spec.accent !== 'auto' ? spec.accent : WORLD_ACCENT[spec.world ?? 'cloud'];
  const sigil = sigilSvg(slug, spec.title, accent);
  writeFileSync(join(outDir, 'sigil.svg'), sigil);

  const base = { accent, code: spec.code, diagram: spec.diagram, title: spec.title };
  const cc = cloudCoverTemplate(base);
  const buf = await shoot(browser, cc.html, cc.w, cc.h);
  await writeWebp(buf, join(outDir, 'cover.webp'), 80);
  const ccr = cloudCoverTemplate({ ...base, rtl: true });
  await writeWebp(await shoot(browser, ccr.html, ccr.w, ccr.h), join(outDir, 'cover-rtl.webp'), 80);
  // portrait = the art column only (terminal + diagram), cropped from the LTR cover
  await sharp(buf).extract({ left: 650, top: 40, width: 920, height: 820 }).resize(1080, 1350, { fit: 'cover' }).webp({ quality: 80 }).toFile(join(outDir, 'cover-portrait.webp'));
  // thumb = the terminal window, which reads as "code" at small sizes
  await sharp(buf).extract({ left: 690, top: 100, width: 520, height: 470 }).resize(480, 600, { fit: 'cover' }).webp({ quality: 80 }).toFile(join(outDir, 'thumb.webp'));
  writeMeta(outDir, accent);
  console.log(`  ✓ ${slug} (cloud diagram) accent=${accent}`);
}

/** The project's accent, for the site's per-project colour theme (src/lib/assets.ts). */
function writeMeta(outDir: string, accent: string) {
  writeFileSync(join(outDir, 'meta.json'), JSON.stringify({ accent }, null, 2) + '\n');
}

async function main() {
  const only = process.argv.slice(2).filter((a) => !a.startsWith('-'));
  const slugs = only.length
    ? only
    : readdirSync(SRC).filter((d) => !d.startsWith('.') && !d.startsWith('_') && existsSync(join(SRC, d)));

  const browser = await chromium.launch();
  try {
    for (const slug of slugs) {
      const dir = join(SRC, slug);
      const shotsPath = join(dir, 'shots.yaml');
      const diagramPath = join(dir, 'diagram.yaml');
      if (existsSync(shotsPath)) {
        const spec = parseYaml(readFileSync(shotsPath, 'utf8')) as ShotsYaml;
        // fresh output dir
        rmSync(join(OUT, slug), { recursive: true, force: true });
        await renderScreenshotProject(browser, slug, spec);
      } else if (existsSync(diagramPath)) {
        const spec = parseYaml(readFileSync(diagramPath, 'utf8')) as DiagramYaml;
        rmSync(join(OUT, slug), { recursive: true, force: true });
        await renderCloudProject(browser, slug, spec);
      } else {
        console.log(`  – ${slug}: no shots.yaml or diagram.yaml, skipping`);
      }
    }
  } finally {
    await browser.close();
  }
  console.log('assets done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
