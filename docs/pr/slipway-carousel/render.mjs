// Render the Slipway carousel: one PNG per slide (1080×1350) and one PDF (LinkedIn
// "document" post). Run from the repo root: node docs/pr/slipway-carousel/render.mjs
import { chromium } from 'playwright';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
await page.goto(pathToFileURL(join(dir, 'deck.html')).href, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
const slides = page.locator('section.slide');
const n = await slides.count();
for (let i = 0; i < n; i++) {
  await slides.nth(i).screenshot({ path: join(dir, `slide-${String(i + 1).padStart(2, '0')}.png`) });
}
await page.setViewportSize({ width: 1280, height: 1350 });
await page.locator('#preview').screenshot({ path: join(dir, 'social-preview.png') });
await page.pdf({ path: join(dir, 'slipway-carousel.pdf'), width: '1080px', height: '1350px', printBackground: true, preferCSSPageSize: true });
const left = await page.evaluate(() => (document.body.innerText.match(/\{\{NUMBER:[^}]*\}\}/g) ?? []).length);
console.log(`  ✓ ${n} slides → slide-NN.png + slipway-carousel.pdf + social-preview.png${left ? `  (${left} {{NUMBER}} placeholders still in the copy)` : ''}`);
await browser.close();
