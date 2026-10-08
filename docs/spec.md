# Spec — "Two Worlds" portfolio (Dark-inspired)

Status: **approved by the owner on 2026-10-08**. Implement this; don't redesign it. If something here is
impossible or clearly wrong, write the problem and your proposed change into `docs/decisions-log.md`
and ask the owner before deviating.

Owner: Mohamed H. Essa — Senior Mobile Engineer (Flutter) moving toward Cloud/DevOps/Platform.
AWS Certified Solutions Architect – Associate (Jun 2026). Speaks EN / DE / AR.
Contact: me@mecodes.live · linkedin.com/in/mohamed-hosny-essa · domain: mecodes.live

---

## 1. Goal and how we measure it

**Goal: more recruiter replies.** The site has to impress in the first 5 seconds *and* give a recruiter
everything they need in under 30 seconds. When spectacle and speed conflict, **speed wins**.

Success criteria (all must hold):
- The first meaningful content (name, role, CTA) is visible in < 1.5 s on a mid-range phone over 4G. Lighthouse mobile Performance ≥ 90, Accessibility ≥ 95, SEO = 100.
- Every page is complete, readable HTML with JavaScript disabled (the map degrades to a list).
- A recruiter can get a PDF CV for the right track and language in **one click** from any page.
- Every track × language combination has its own shareable URL and its own OG preview image.
- Adding a new project = adding **one YAML file + one image folder** and running one command.

## 2. The core concept: two worlds, one origin

Dark has three worlds joined by the triquetra. Mohamed's career maps onto that:

| World | Accent | Contents |
|---|---|---|
| **Mobile** | amber `#E8B23A` (Jonas's raincoat) | Flutter / React Native apps: UNICEF case mgmt, Aratc, Heaven Flowers, Qanony, Al3wn… |
| **Cloud** | cold cyan `#5DB8D6` | AWS, IaC, K8s, serverless, platform work, AWS SAA cert |
| **Origin** (the knot) | pale white-gold `#EDE6D6` | Where the two meet: CI/CD & release engineering, code signing, mobile security hardening (MobSF, cert pinning), Node/Nest backends |

The story the site tells: *"I build the apps, and I build what they run on."* The Origin world is what
makes the move to DevOps believable: it's real work he already did.

## 3. Decisions (each one is final)

### D1 — "Choose your world" replaces Dark's season/episode spoiler filter
- Dark: the user picks season + episode, stored in Vuex `{season, episode}`; a route guard hides content past that point.
- Ours: the bare URL `/` → language detect → `/{lang}/` shows a full-screen **world chooser** (Mobile · Cloud · Both).
  The choice navigates to `/{lang}/{track}/` where `track ∈ mobile | cloud | all`.
- The track changes: hero headline + subline, the order and emphasis of projects (other-world projects are dimmed, not hidden, on the map),
  the featured project, the skills list, and which CV PDF the "CV" button downloads.
- Remember the last choice in `localStorage` (try/catch), but **URLs always win**. A link with a track never shows the chooser.
- Mohamed sends **track-specific links** in job applications (`/de/cloud/?ref=company`). That's the main reply lever.

### D2 — "Seasons" = career eras, used as a filter on the map
- Season 1 · Origins — 2019–2021 (university, IEEE Flutter committee head, GDSC, best Flutter student award)
- Season 2 · Freelance — 2022–2024 (EGPI simulator, Al3wn, Node/Nest/React clients)
- Season 3 · IntraZero — 2024–now (UNICEF, Aratc, Heaven Flowers, release pipeline, security hardening)
- Season 4 · Cloud — 2026– (AWS SAA, cloud projects). This season grows over time, and that's the point.
- These are Dark-style chips on the map ("Season 2"). They filter and zoom the map; they don't gate content.

### D3 — The map ("the Timeline") is a pannable DOM/SVG canvas, not a WebGL scene
- X axis = time (2019 → now). Three horizontal lanes: Mobile (top), Origin (middle), Cloud (bottom).
- Nodes = projects, roles, certifications. Each node is a real `<a href>` (crawlable, focusable, works without JS).
- Edges = SVG paths between related nodes (e.g. "Aratc app" ↔ "Aratc AWS infra" ↔ "release pipeline"), with a slow dashed "flow" animation like Dark's `dashed-line` keyframes.
- Interaction: drag/swipe to pan (with inertia), wheel/pinch to zoom (clamped), arrow keys pan, `+`/`-` zoom, Season chips jump the camera.
- Clicking a node opens its **dossier** (see D4).
- **Why not WebGL like Dark:** accessibility, SEO, and the implementer's success rate. The only GPU layer is a decorative background (D6).
- **RTL (Arabic):** the time axis flips, so time flows right → left.
- **Phones (< 768 px):** no forced landscape (Dark does this; it's bad for recruiters who open links from LinkedIn on their phone). The map becomes a vertical timeline (time top→bottom, lanes as colored left borders). Same data, same component props.

### D4 — Project dossiers (Dark's character pages)
Route `/{lang}/{track}/p/{slug}/`. It's a full page (SSR), and on the map it opens with a "card → workspace"
expansion (View Transitions API, falling back to a normal navigation). Fixed structure, which recruiters scan:
1. Title, world badge(s), years, role, platform links (App Store / Play / GitHub / live)
2. **One-line impact** (a number if one exists: "87 % fewer widget rebuilds")
3. Problem → What I built → Result (3 short blocks, ≤ 60 words each)
4. Hero visual (generated, see `docs/assets.md`) + a screenshot gallery
5. Stack chips · "Connected to" (linked nodes) · next/prev in the same world
Confidential client work: describe only what's public. The YAML `confidential: true` hides links and swaps screenshots for blurred ones.

### D5 — Languages: EN (default), DE, AR
- Routes are `/{en|de|ar}/...`. `<html lang dir>` is set per locale. AR uses `dir="rtl"`, logical CSS properties everywhere (`margin-inline-start`, never `margin-left`).
- Fonts: Space Grotesk (display, Latin), JetBrains Mono (labels/meta), Tajawal (Arabic; it's what Dark uses). Self-hosted via `@fontsource`, subset, `font-display: swap`.
- A missing translation falls back to EN **with a build warning** (never a crash, never an empty string).
- The language switcher keeps the current track + page.
- German text should be written as a German-speaking engineer would write it, not machine-literal. The owner will review DE and AR copy.

### D6 — Atmosphere, motion and sound
- Background: a near-black field (`#080808`) with slow drifting particles plus a faint glow in the current world's accent. One `<canvas>` with Canvas2D (WebGL optional later), paused when the tab is hidden, **static when `prefers-reduced-motion`**, and capped at 30 fps on phones.
- Page transitions: a "ripple" crossfade (Dark has FADE / RIPPLE / RIPPLE_UP / RIPPLE_DOWN). Implement with the View Transitions API + CSS, max 450 ms, easing `cubic-bezier(.455,.03,.515,.955)` (Dark's main easing; also `.785,.135,.15,.86` for emphatic moves).
- Intro: a "particle logo" (motion kit #16) forming the "ME" monogram / triquetra, **≤ 1.2 s, skippable, shown once per session**. No loading-percentage screen.
- Motion kit effects (`~/work/opus-5-5-motion-graphics-kit`) to re-implement, not copy-paste:
  - #15 Flowing paths → the CI/CD pipeline diagram (commit → build → sign → store / → deploy) on Origin dossiers
  - #13 Perspective shift → "app → API → cloud" layer explode on the home page
  - #05 Chart morph → impact metrics on dossiers
  - #03 Card → workspace → node → dossier transition
  - #08 Magnetic dock → the skills dock
  - #09 Masked type → the hero name reveal
- **No sound.** (Dark uses Howler and autoplay-muted ambient sound. Skip it, YAGNI.)

### D7 — Recruiter fast path
- A persistent "CV ↓" button in the header on every page: it downloads `/{lang}/cv/{track}.pdf`.
- Plus an HTML CV page `/{lang}/cv/{track}/` that's plain and ATS-readable (semantic headings, no columns trickery). The PDFs are printed from these pages at build time with Playwright.
- A "Skip intro" link is the first focusable element.
- Contact: mailto + LinkedIn + "Copy email" button, in the header menu and the footer of every page.

### D8 — Hosting: GitHub Pages, and the pipeline itself is a showcase (owner decision, 2026-10-08)
- Deploy with **GitHub Actions → GitHub Pages** (`actions/upload-pages-artifact` + `actions/deploy-pages`), from `main`.
  Custom domain `mecodes.live` via `public/CNAME` and the repo's Pages settings; enforce HTTPS.
  If there's no custom domain yet, set Astro `site`/`base` for `https://<user>.github.io/<repo>/`, and route every internal link through a `url()` helper that respects `import.meta.env.BASE_URL` (never hard-code `/en/...`).
- Pages has no server: no redirects, no headers, no rewrites. So:
  `/` is a static page that picks the language from `navigator.languages` and `location.replace`s, with a `<meta http-equiv="refresh">` to `/en/` as the no-JS fallback and visible links to all three languages.
  `404.html` is Astro's `src/pages/404.astro` (Pages serves it automatically).
  Use `trailingSlash: 'always'` + `build.format: 'directory'` so every URL is a real folder.
- The CI pipeline is part of the Cloud story. `.github/workflows/deploy.yml` runs: install → content schema validation → `astro check` → build → Playwright PDF generation → link check → Lighthouse CI budgets (fail under the thresholds in §1) → deploy. PRs run everything except deploy.
- A `/{lang}/colophon/` page ("How this site is built") shows this pipeline as an animated diagram (motion kit #15 style) with live build info (commit SHA, build time from env at build). The footer shows `build a1b2c3d · 2026-10-08`.
- Later, optional: an `infra/` folder with a Terraform S3 + CloudFront variant as an IaC sample. Not needed to launch.

### D8b — Mobile is a first-class design, not a squeezed desktop (owner requirement)
Most recruiters first open the link from LinkedIn on a phone. Design and test **at 390×844 first**, then scale up.
- World chooser on phone: three stacked full-width "world" panels (≥ 64 px tall tap targets); each panel shows its accent glow.
- Timeline on phone: a vertical scroll timeline (see D3). Season chips stay as a sticky horizontal scroller under the header. Nodes are cards with a thumbnail (`thumb` asset), title, one-line impact.
- Dossier on phone: the hero visual uses the `cover-portrait` asset (4:5), not a cropped 16:9.
- Header on phone: logo · language · "CV ↓" always visible; everything else goes in a full-screen menu.
- Thumb zone: primary actions sit in the bottom half; no hover-only affordances; tap targets ≥ 44 px; no horizontal page scroll at 320 px width.
- Background particles on phones: ≤ 60 particles, 30 fps cap, off under `prefers-reduced-motion` or `saveData`.
- Every phase in `docs/plan.md` must be checked at 390 px and 320 px widths before it's marked done.

### D9 — Measuring replies
- Privacy-friendly analytics (Plausible or self-hosted Umami; no cookie banner needed). Track: track chosen, language, CV downloads, `?ref=` value.
- The `?ref=` parameter lets Mohamed see which application's link got opened.

## 4. Information architecture

```
/                          → redirect to /{detected lang}/  (static page: JS language detect + meta-refresh fallback; GitHub Pages has no server redirects)
/{lang}/                   → world chooser (+ short intro, name, CTA row)
/{lang}/{track}/           → hero + the Timeline map + featured project + skills dock + contact
/{lang}/{track}/p/{slug}/  → project dossier
/{lang}/cv/{track}/        → HTML CV           /{lang}/cv/{track}.pdf → PDF
/{lang}/colophon/          → how the site is built
/404                       → Dark-styled "this timeline doesn't exist" with links home
```
lang ∈ {en, de, ar} · track ∈ {mobile, cloud, all}

## 5. Out of scope (don't build)
Blog, CMS, comments, dark/light toggle (it is always dark), sound, WebGL map, a Flutter Web version,
contact form backend (mailto is enough), per-project 3D models.
