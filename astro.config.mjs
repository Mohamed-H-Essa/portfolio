// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// GitHub Pages: static output, directory URLs (every route is a real folder,
// so Pages serves /en/ as /en/index.html with no server rewrite).
// If launching on <user>.github.io/<repo>/ instead of the custom domain,
// set BASE to '/<repo>/' via the env var; the url() helper honours it.
// Default: GitHub Pages user site (repo named mohamed-h-essa.github.io → served at the root).
// The owner no longer has mecodes.live; set SITE_URL when a custom domain exists.
const SITE = process.env.SITE_URL ?? 'https://mohamed-h-essa.github.io';
const BASE = process.env.BASE_PATH ?? '/';

export default defineConfig({
  site: SITE,
  base: BASE,
  trailingSlash: 'always',
  build: { format: 'directory' },
  i18n: {
    locales: ['en', 'de', 'ar'],
    defaultLocale: 'en',
    routing: {
      prefixDefaultLocale: true, // /en/... always present; we write our own / page
      redirectToDefaultLocale: false,
    },
  },
  integrations: [
    sitemap({
      // a project page exists under every track; only its canonical ('all') URL is listed
      filter: (page) => !/\/(mobile|cloud)\/p\//.test(page),
    }),
  ],
});
