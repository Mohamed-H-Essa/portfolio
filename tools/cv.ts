// Render the two résumés from their HTML sources (assets-src/cv/*.html) to the PDFs the
// site serves (public/cv/, filenames fixed: the CV buttons link to them).
//   npm run cv            → both
//   npm run cv -- devops  → one (devops | mobile)
// Chromium's print engine; fonts are the system's Arial (metric-compatible with the
// Liberation Sans of the originals), so line breaks and page counts match.
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const CVS = {
  devops: { src: 'assets-src/cv/cloud-devops.html', out: 'public/cv/Mohamed-Essa-Cloud-DevOps.pdf', pages: 1 },
  mobile: { src: 'assets-src/cv/mobile-engineer.html', out: 'public/cv/Mohamed-Essa-Mobile-Engineer.pdf', pages: 2 },
} as const;

const only = process.argv[2] as keyof typeof CVS | undefined;
const browser = await chromium.launch();
for (const [key, cv] of Object.entries(CVS)) {
  if (only && only !== key) continue;
  const page = await browser.newPage();
  await page.goto(pathToFileURL(resolve(cv.src)).href, { waitUntil: 'load' });
  await page.emulateMedia({ media: 'print' });
  const pdf = await page.pdf({ path: cv.out, preferCSSPageSize: true, printBackground: true });
  // a page count that drifts means the content no longer fits its layout
  const n = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length;
  console.log(`  ${n === cv.pages ? '✓' : '✗'} ${cv.out}: ${n} page(s), expected ${cv.pages}`);
  if (n !== cv.pages) process.exitCode = 1;
  await page.close();
}
await browser.close();
