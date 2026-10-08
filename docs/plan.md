# Implementation plan

Work the phases **in order**. Each task has an acceptance check, and a task is done only when its check passes.
After each phase: run `npm run check && npm run build`, look at the result at **390 px, 320 px and 1440 px** widths,
in **en and ar**, then commit (`feat(phaseN): …`). Tick the boxes in this file as you go. That's the progress record
for the next session.

Read first: `AGENTS.md` → `docs/spec.md` → this file. `docs/assets.md` and `docs/content-intake.md` when you reach those phases.

---

## Phase 0 — Scaffold (done by the planner, 2026-10-08)
- [x] Docs, content template, git repo.
- [ ] Astro project scaffolded (see "Init commands" at the end of this file). Check: `npm run dev` serves the default page.

## Phase 1 — Foundations
- [ ] **Config.** `astro.config.mjs`: `site: 'https://mecodes.live'`, `trailingSlash: 'always'`, `build.format: 'directory'`,
      i18n `locales: ['en','de','ar']`, `defaultLocale: 'en'`, `prefixDefaultLocale: true`, `routing.redirectToDefaultLocale: false`
      (we write our own `/` page). TS strict.
- [ ] **Design tokens** in `src/styles/tokens.css`:
      `--bg:#080808; --bg-2:#111; --ink:#EDEDED; --ink-2:#9A9A9A; --line:rgba(255,255,255,.12);`
      `--mobile:#E8B23A; --cloud:#5DB8D6; --origin:#EDE6D6; --accent:var(--origin)` (set per track on `<body data-track>`),
      `--ease:cubic-bezier(.455,.03,.515,.955); --ease-strong:cubic-bezier(.785,.135,.15,.86);`
      type scale with `clamp()`; labels = JetBrains Mono, uppercase, `letter-spacing:.18em`, 11–13 px.
      Logical properties only (stylelint rule or a grep check in CI: no `margin-left|padding-right|left:|right:` in src). `body` always dark.
- [ ] **Fonts** via `@fontsource/space-grotesk`, `@fontsource/jetbrains-mono`, `@fontsource/tajawal` (only the weights used, latin/arabic subsets).
      Arabic pages use Tajawal for everything.
- [ ] **i18n core**: `src/i18n/{en,de,ar}.json` UI strings; `t(lang, key)` with EN fallback + a console warning at build;
      `loc(lang, field)` for localized content fields; `url(lang, ...parts)` that respects `BASE_URL`; `dir(lang)`.
      Check: a unit test (vitest) covers the fallback + url().
- [ ] **Content collection** `src/content.config.ts`: a glob loader for `src/content/projects/*.yaml` (ignore `_*.yaml`),
      a zod schema matching `_template.yaml` (localized = `{en: string, de?: string, ar?: string}`), unique `code` and `slug`
      validation, `connects` must reference existing slugs. Check: a bad file fails the build with a clear message.
- [ ] **Base layout** `src/layouts/Base.astro`: `<html lang dir>`, meta + OG tags (image `og/<lang>-<track>.png`, hreflang alternates for
      the 3 langs), skip link, header (sigil logo · language switch · track switch · "CV ↓"), footer (contact, build SHA + date from
      `process.env.GITHUB_SHA`/build time, fallback "dev").
      Check: a no-JS render shows a fully usable header at 320 px.
- [ ] **Root `/`** (`src/pages/index.astro`): detect language → `location.replace`, meta-refresh fallback, three visible language links.
- [ ] **404** (`src/pages/404.astro`): "This timeline doesn't exist." + links to `/en/`, `/de/`, `/ar/`.
- [ ] **CI/CD** `.github/workflows/deploy.yml` per spec D8 (start with install → check → build → deploy to Pages; add PDF, link check
      and Lighthouse budgets in Phase 7). `public/CNAME` = `mecodes.live` **only after the owner confirms the DNS switch** (owner-todo).
      Check: a push to main deploys and the Pages URL loads.

## Phase 2 — Seed content (2 real projects, end to end, before building more UI)
- [ ] Write `aratc.yaml` and `qanony.yaml` per `docs/content-intake.md` (read their repos briefly; questions → `docs/owner-todo.md`).
- [ ] Write the role/cert nodes: `intrazero.yaml` (role), `freelance.yaml` (role), `ieee-flutter.yaml` (role), `aws-saa.yaml` (cert).
- [ ] Write `release-pipeline.yaml` and `mobile-security-hardening.yaml` (Origin), and `egpi-simulator.yaml`, from the LinkedIn facts.
- Check: the build passes; every node has en + a de/ar draft marked `review`.

## Phase 3 — Asset pipeline (docs/assets.md)
- [ ] `tools/assets/clean.ts` (sharp) + `render.ts` (Playwright) + templates: `cover`, `cover-portrait`, `thumb`, `gallery`, `og`, `sigil`, `cover-cloud`.
      `npm run assets [-- slug]`.
- [ ] Run it for **aratc** first (raw from `~/Documents/aratc screenshots` → copy into `assets-src/aratc/raw/`), then qanony
      (raw = `~/work/qanony_flutter/store_screenshots/`; its `store_output/` frames can serve as gallery extras).
- [ ] Site-level OG images: 9 × `public/og/<lang>-<track>.png`.
- Check: the quality checklist in assets.md passes for both projects. Show the owner `cover` + `thumb` for aratc before continuing (owner-todo).

## Phase 4 — World chooser + track home
- [ ] `/{lang}/` world chooser: 3 worlds (Mobile · Cloud · Both). Desktop: three tall columns that widen on hover/focus with accent glow;
      phone: three stacked panels. Short intro line, name with a **masked type** reveal (kit #09), "CV ↓" and contact visible.
      Remember the choice in localStorage (try/catch). Check: works with keyboard only and without JS (plain links).
- [ ] `/{lang}/{track}/` page: hero (track headline + subline from i18n), featured project card, Timeline (Phase 5 placeholder list first),
      skills dock (kit #08, as a plain list on touch), "app → API → cloud" perspective layer (kit #13; static image under reduced motion), contact block.
- [ ] Track switch in the header keeps the current page; language switch keeps track + page.

## Phase 5 — The Timeline map (spec D3)
- [ ] Data → layout: a pure function `layoutTimeline(nodes, track, dir)` → `{x,y}` per node (x from `start`, lane from primary world,
      collision nudging), edges as cubic paths. Unit-tested (LTR and RTL mirror).
- [ ] Render: SSR `<ol>` of node `<a>` cards (no-JS fallback = vertical list). JS island `Timeline.ts` enhances ≥ 768 px into the pan/zoom canvas:
      pointer drag with inertia, wheel/pinch zoom clamped 0.6–2, arrow keys / +/-, Season chips (`s1..s4`) animate the camera (GSAP, `--ease-strong`).
      Nodes: thumb + code + title; dimmed (opacity .35, grayscale) when `weight[track]==0`; hover/focus = pulse + edge highlight; edges have a dashed flow animation.
      Year ticks along the axis; lane labels "MOBILE / ORIGIN / CLOUD" in mono caps.
- [ ] < 768 px: vertical timeline (time top→bottom), sticky season chips, cards with thumb + impact line. **No pan/zoom on phones.**
- [ ] Reduced motion: no inertia/flow/pulse; camera moves are instant.
- Check: 60 fps pan on a mid laptop; at 320 px no horizontal scroll; screen reader reads nodes in chronological order.

## Phase 6 — Dossiers + atmosphere
- [ ] `/{lang}/{track}/p/{slug}/` per spec D4: `cover` (desktop) / `cover-portrait` (phone) via `<picture>`, impact metric with
      a **chart morph** count-up (kit #05) when a metric exists, Problem/Built/Result, gallery (horizontal snap scroller on phone),
      stack chips, "Connected to" mini-map, prev/next in world.
- [ ] Origin dossiers (release pipeline): a **flowing paths** diagram (kit #15): commit → test → build → sign → TestFlight/Play → store.
- [ ] Node → dossier: View Transitions (`<ClientRouter />` or native cross-document `@view-transition`), thumb morphs into cover; ripple fallback.
- [ ] Background canvas (spec D6): particles + accent glow, pauses on `visibilitychange`, respects reduced motion / saveData, ≤ 60 particles on phones.
- [ ] Intro: particle-logo sigil (kit #16), ≤ 1.2 s, once per session (sessionStorage), skippable, never delays LCP text.

## Phase 7 — CV + quality gates
- [ ] `/{lang}/cv/{track}/` HTML CV built from the same content (roles, top projects by weight, skills, certs, education, languages).
      Print CSS: A4, single column, black on white, ATS-safe.
- [ ] `tools/pdf.ts`: Playwright prints the 9 CVs to `dist/{lang}/cv/{track}.pdf` after the build (in CI). The "CV ↓" button links there.
- [ ] Colophon page (spec D8) with the pipeline diagram + build info.
- [ ] CI additions: link check (lychee or `linkinator`), Lighthouse CI on `/en/`, `/en/mobile/`, `/ar/cloud/`, one dossier (mobile emulation) with
      budgets Perf ≥ 90, A11y ≥ 95, SEO 100; fail the job below that.
- [ ] Analytics snippet (Plausible) behind a config flag; events: track_choose, cv_download, lang_switch; pass `?ref=` as a prop.

## Phase 8 — Rest of the content
- [ ] Remaining projects from `docs/content-intake.md`, after the owner confirms the list and answers `docs/owner-todo.md`.
- [ ] Assets for each. DE/AR copy pass. The owner reviews translations → set `review` false.
- [ ] Final pass: every page at 320/390/768/1440, en/de/ar, keyboard only, reduced motion, JS disabled.

---

## Init commands (Phase 0, run in tmux window `claude_work`)
```bash
cd ~/work/dark_portfolio
npm create astro@latest . -- --template minimal --typescript strict --no-git --install --yes
npx astro add sitemap --yes
npm i gsap @fontsource/space-grotesk @fontsource/jetbrains-mono @fontsource/tajawal yaml
npm i -D vitest playwright sharp tsx @playwright/test
npx playwright install chromium
```
Then add the scripts to package.json: `"check": "astro check && vitest run"`, `"assets": "tsx tools/assets/render.ts"`,
`"pdf": "tsx tools/pdf.ts"`. Add to .gitignore: `.cache/`, `assets-src/*/raw/` (raw screenshots stay local; they may hold client data).
