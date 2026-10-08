# Search engines, AI readers, link previews, icons

How the site presents itself to anything that isn't a person looking at it: Google, LinkedIn/WhatsApp/Slack link
previews, AI assistants (ChatGPT, Claude, Perplexity…), browser tabs and phone home screens. All of it is generated from
the same content files as the pages, so it never drifts.

---

## What a crawler sees

**Every page is complete HTML without JavaScript.** The 3D map, the ∞ intro and the engine-mode project pages are
enhancements on top. Concretely:

| Page | In the HTML |
|---|---|
| `/` and `/{lang}/` (∞ intro) | name, tagline, the language links / the three world links |
| `/{lang}/{track}/` (map) | every project as a card link + the Index list (code, title, layer, year) |
| `/{lang}/{track}/p/{slug}/` (project) | title, role, years, impact, Problem / Built / Result, gallery `alt` text, stack, connected projects, prev/next |

On project pages the engine hides inactive frames with CSS (`opacity`, `inert`), but the text is in the DOM, so search
engines index all of it. With JavaScript off the page is an ordinary scrolling document.

## Duplicate URLs → one canonical

A project page exists under every track (`/en/mobile/p/qanony/`, `/en/cloud/p/qanony/`, `/en/all/p/qanony/`): same
content, different neighbours. Each one's `<link rel="canonical">` points at the **`all`** version, and only that version is
in the sitemap (`astro.config.mjs` → `sitemap({ filter })`). Each language has its own canonical (`hreflang` en/de/ar +
`x-default` → en).

## Files for machines

| URL | Source | What |
|---|---|---|
| `/robots.txt` | `src/pages/robots.txt.ts` | allow everything (a portfolio wants to be found), sitemap + llms.txt pointers |
| `/sitemap-index.xml` | `@astrojs/sitemap` | every page except the non-canonical project duplicates |
| `/llms.txt` | `src/lib/llms.ts` | plain-markdown summary for AI assistants: who, contact, every project in one line with its link |
| `/llms-full.txt` | `src/lib/llms.ts` | every project in full: role, years, impact, stack, links, Problem / Built / Result |

`llms.txt` follows the [llms.txt convention](https://llmstxt.org): when someone asks an assistant about the owner and
it fetches the site, this is the fastest accurate answer. Every page also links it with
`<link rel="alternate" type="text/markdown">`.

**AI crawlers are allowed** (GPTBot, ClaudeBot, PerplexityBot…). To opt one out, add to `robots.txt.ts`:
`User-agent: GPTBot` / `Disallow: /`.

## Structured data (JSON-LD)

`src/lib/schema.ts`, passed to `Base.astro` via `jsonLd`:

- **Person** (intro, maps): name, title, tagline, Cairo, Benha University, languages, skills (from the content's stacks),
  the AWS credential with its Credly link, LinkedIn + GitHub. One `@id` (`/#person`) so every page refers to the same person.
- **WebSite** (intro).
- **Project pages:** `MobileApplication` when it has store links (with `operatingSystem` and `sameAs` → the store pages),
  `EducationalOccupationalCredential` for certs, `CreativeWork` otherwise; plus a **BreadcrumbList**
  (name → world → project).

Only facts already on the site go here. Check a page with Google's Rich Results Test or `validator.schema.org`.

## Link previews (Open Graph / Twitter)

- Maps and intro: `public/og/{lang}-{track}.jpg` (1200×630): the ∞, the name, the track's title and subtitle, in that language.
- Project pages: the project's captioned `public/projects/{slug}/og.png` when it exists, else the track image.
- Tags: `og:title/description/image(+width/height/alt)/url/site_name/locale`, `twitter:card=summary_large_image` + title,
  description, image.

Regenerate after changing a track title or subtitle: `npm run brand`. LinkedIn caches previews; refresh one at
`linkedin.com/post-inspector`.

## Icons

`npm run brand` (`tools/brand.ts`) draws the mark (the intro's ∞ in amber → white-gold → cyan on a dark tile) from the same
geometry as the intro (`src/lib/lemniscate.ts`) and writes:

| File | For |
|---|---|
| `favicon.svg` | modern browsers' tab icon (crisp at any size) |
| `favicon.ico` (16 / 32 / 48) | older browsers, Windows, bookmarks |
| `apple-touch-icon.png` (180) | iOS home screen (full-bleed; iOS rounds it) |
| `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` | Android / installable web app (`site.webmanifest`) |

Plus `theme-color` and `color-scheme: dark` so phone browser bars match the site.

## Keep it healthy

- Every page has a unique `<title>` and `<meta name="description">` (project pages use their impact line).
- The 404 page is `noindex`.
- **Known gap:** the CV and "How this site is built" links are in the header/footer on every page but those pages don't
  exist yet (plan Phase 7). Build them, or hide the links, before launch; crawlers count broken links.
- After deploying: submit `sitemap-index.xml` in Google Search Console and Bing Webmaster Tools.
