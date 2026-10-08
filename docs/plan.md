# Implementation plan

Work the phases **in order**. Each task has an acceptance check, and a task is done only when its check passes.
After each phase: run `npm run check && npm run build`, look at the result at **390 px, 320 px and 1440 px** widths,
in **en and ar**, then commit (`feat(phaseN): …`). Tick the boxes in this file as you go. That's the progress record
for the next session.

Read first: `AGENTS.md` → `docs/spec.md` → this file. `docs/assets.md` and `docs/content-intake.md` when you reach those phases.

---

## Phase 0 — Scaffold (done by the planner, 2026-10-08)
- [x] Docs, content template, git repo.
- [x] Astro project scaffolded 2026-10-08 (minimal template, deps installed). Still to do in Phase 1: `npx playwright install chromium`; the sitemap warning goes away once `site` is set. Check: `npm run dev` serves the default page.

## Phase 1 — Foundations  ✅ DONE 2026-10-08 (check + build green, screenshots verified at 390/1440 in en + ar RTL)
- [x] **Config.** `astro.config.mjs`: site/base (base via `BASE_PATH` env for the `<user>.github.io/<repo>/` case), `trailingSlash:'always'`, `build.format:'directory'`, i18n en/de/ar, `prefixDefaultLocale:true`, `redirectToDefaultLocale:false`. TS strict.
- [x] **Design tokens** in `src/styles/tokens.css`:
      `--bg:#080808; --bg-2:#111; --ink:#EDEDED; --ink-2:#9A9A9A; --line:rgba(255,255,255,.12);`
      `--mobile:#E8B23A; --cloud:#5DB8D6; --origin:#EDE6D6; --accent:var(--origin)` (set per track on `<body data-track>`),
      `--ease:cubic-bezier(.455,.03,.515,.955); --ease-strong:cubic-bezier(.785,.135,.15,.86);`
      type scale with `clamp()`; labels = JetBrains Mono, uppercase, `letter-spacing:.18em`, 11–13 px.
      Logical properties only throughout (verified by eye in RTL). `body` always dark. Also `src/styles/base.css` (reset, skip link, `.shell`, reduced-motion).
- [x] **Fonts** via `src/styles/fonts.css`: Space Grotesk (latin 400/600/700), JetBrains Mono (latin 400/500), Tajawal (arabic 400/500/700). RTL swaps display face to Tajawal.
- [x] **i18n core**: `src/i18n/{en,de,ar}.json` + `index.ts` (`t`, `translator`, `loc`, `url`, `dir`) + `config.ts` (LOCALES, TRACKS, meta). EN fallback warns once. `i18n.test.ts`: 10 tests pass.
- [x] **Content collection** `src/content.config.ts` (zod via `astro:schema`, glob ignores `_*.yaml`). Relational checks (unique slug/code, `connects` resolve) in `src/lib/content.ts::loadProjects()`. Helpers: `projectsForTrack`, `featuredForTrack`, `isDimmed`.
- [x] **Base layout** `src/layouts/Base.astro` (lang/dir, canonical, hreflang×3 + x-default, OG). `components/Header.astro` (sigil, inline track+lang switches, always-on CV ↓, phone hamburger menu), `Footer.astro` (contact, copy-email, colophon link, build SHA·date), `Sigil.astro`.
- [x] **Root `/`** `src/pages/index.astro`: JS lang-detect + `location.replace`, meta-refresh fallback, 3 visible language links.
- [x] **404** `src/pages/404.astro`.
- [x] **CI/CD** `.github/workflows/deploy.yml`: PR → ci (checkout, node20, npm ci, `npm run check`, build, upload artifact); main → deploy-pages. **`public/CNAME` NOT added yet** — waiting on the owner's DNS answer in owner-todo. Phase 7 adds PDF + link check + Lighthouse here.
- [ ] **Remaining for the implementer:** push to GitHub, enable Pages (Settings → Pages → Source: GitHub Actions), confirm the Actions deploy succeeds and the Pages URL loads. If launching on `<user>.github.io/<repo>/`, set repo variable/secret so the build runs with `BASE_PATH=/<repo>/` and `SITE_URL` accordingly.

## Phase 2 — Seed content (2 real projects, end to end, before building more UI)
- [ ] Write `aratc.yaml` and `qanony.yaml` per `docs/content-intake.md` (read their repos briefly; questions → `docs/owner-todo.md`).
- [ ] Write the role/cert nodes: `intrazero.yaml` (role), `freelance.yaml` (role), `ieee-flutter.yaml` (role), `aws-saa.yaml` (cert).
- [ ] Write `release-pipeline.yaml` and `mobile-security-hardening.yaml` (Origin), and `egpi-simulator.yaml`, from the LinkedIn facts.
- Check: the build passes; every node has en + a de/ar draft marked `review`.

## Phase 3 — Asset pipeline (docs/assets.md)  ✅ CORE DONE 2026-10-08
- [x] `tools/assets/`: `lib.ts` (device detect, accent sampling, status-bar repaint, top-edge colour), `clean.ts` (sharp), `templates.ts` (cover, cover-portrait, thumb, gallery, cover-cloud + ground/grain/glow/watermark), `sigil.ts` (deterministic per-slug mark), `render.ts` orchestrator. `npm run assets [-- slug]`. Screenshot projects read `assets-src/<slug>/shots.yaml`; code/cloud projects read `diagram.yaml` → terminal+architecture cover.
- [x] Ran for **aratc** (masks the LOCAL ribbon + repaints status bar) and **qanony** (Arabic-first hero). Also **hope-glove** + **german-study** cloud covers. Output committed to `public/projects/<slug>/` (560K total, all within budget). Covers verified by eye — portfolio-grade.
- [x] Wired into UI: `src/lib/assets.ts` (`hasAssets`, `assetUrl`, `galleryUrl`) + thumbs on track-home node cards (verified rendering, dimmed correctly off-world).
- [ ] **Remaining (gaps for the implementer / owner):**
  - Site-level OG images: 9 × `public/og/<lang>-<track>.png` (make an `og` template in templates.ts; also per-project `og/<lang>.png`). Not built yet — needed before launch for LinkedIn previews.
  - **heaven-flowers**: raw in `~/Downloads/heaven_flower_screenshots` are *pre-composed store frames* (device already in a purple branded frame), 1320×2868. They work as gallery as-is but the hero/thumb device-tilt expects a raw screen; owner-todo asks for raw captures. Write `assets-src/heaven-flowers/shots.yaml` once decided.
  - **ehc-board**: raw in `~/Downloads/the_egyptian_board_screenshots` (5 × webp, 1242×2688) are clean real screens (medical records, wizard). Copy to `assets-src/ehc-board/raw/`, write `shots.yaml` (hero = records list or wizard), add the `ehc-board` content node first.
  - **bioot** (two real-estate apps): no screenshots supplied; owner-todo. Could use `cover-cloud`-style or request captures.
  - Accent sampling is good but `thumb` for cloud projects is a raw crop of the diagram — acceptable; revisit if it reads flat.
- Check: quality checklist in assets.md passed for aratc + qanony (no ribbon/test-data in the status band, tilt reads as one plane, sizes within budget). **Minor known issue:** aratc home hero still shows small "QA Private Session Course / Notification Trainer" demo text in a lower card — in-screen content, not maskable; recapture noted in owner-todo.

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
