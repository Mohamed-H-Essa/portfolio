# HANDOFF — read this first (2026-10-08, end of session 3)

## Session 3, later additions
- Swipe back (`scripts/swipe-back.ts`): project page → map, intro world → language step. Never on the map.
- Frames are interruptible (no input lock; gesture rule in `dossier-engine.ts`).
- Gallery hover + full-screen "open book" viewer (`scripts/lightbox.ts`), 2× gallery renders.
- No custom domain any more: `SITE` defaults to `https://mohamed-h-essa.github.io` (name the repo `mohamed-h-essa.github.io`,
  or set `SITE_URL` / `BASE_PATH`); email `mhosnytech@gmail.com`. Never use mecodes.live.
- New projects: EHC Board, Heaven Flowers (store frames → `framed: true`), Bioot (`links.extra`), Yafleet. Questions in owner-todo.

## Session 3 (latest) — done
- Intro: one screen (no scroll), name + languages from the start, HUD bar arrives last; Cassini-oval background that develops
  after the ∞ is drawn and bends around the pointer (`scripts/intro-field.ts`). Logo everywhere → `/` with the full intro.
- Map: lane names in a coloured front band + year labels on every plane, lanes spaced apart; planes no longer block card
  hover; selected-project card reacts to the pointer (tilt, sheen, sparkles, cycling screens: `scripts/panel-fx.ts`).
- Project pages run in **engine mode** (`styles/engine.css`, `scripts/dossier-engine.ts`): full-screen frames, HUD, no page
  scroll; no-JS = normal page. Map → project **hand-off** (`scripts/handoff.ts`, geometry in `lib/hero-rect.ts`, tested).
  Per-project colour theme from `public/projects/<slug>/meta.json` (written by `npm run assets`).
- Selection/drag hardening (base.css + a dragstart guard in Base.astro).
- SEO/AI/icons: `npm run brand`, canonical = `all` track, JSON-LD, robots, llms.txt. See `docs/seo-and-ai.md`.
- Docs: `docs/adding-projects.md` (how to add a project + missing list from the CV). Owner questions in `owner-todo.md`.
- Next: Phase 7 (CV pages + colophon: currently linked but 404), remaining content, owner review of DE/AR.

## Session 2 — done
- Map polish: featured card centred (cards pivot at their anchor; fly-to uses card x/y/lift/height), RTL panel offset flips,
  compact phone sheet, wider layer gap (±430) so planes don't slice billboards, same-layer MIN_SEP on x, Badge.astro for
  art-less nodes, repeated engraved layer names, `?p=<slug>` opens the map on a card.
- Dossiers `/{lang}/{track}/p/{slug}/` (63 pages) + PipelineFlow diagram for release-pipeline. Map no longer 404s.
- **∞ intro** (`Intro.astro`, `styles/intro.css`, `scripts/intro.ts`, `lib/lemniscate.ts`) replaces `/` and `/{lang}/`.
  Verified by screenshot at 1440 + 390: draw → light orbit → language (AR relabels in place, URL → /ar/) → lobe click zoom → map.
- Not yet: owner review of the intro feel; 320px check of the intro; background canvas (D6); Phase 7 (CV pages/colophon are
  still linked but 404); old-world-chooser i18n keys (`world.chooser.*`) now unused.
- Questions added to owner-todo (Test stage in pipeline, metrics).



State: `main` is green (`npm run check` → 0 errors, 20 tests; `npm run build` → 14 pages).
Read order for a new session: **this file → AGENTS.md → docs/spec.md → docs/plan.md**.
Where this file disagrees with spec.md/plan.md, **this file wins** (it records the owner's latest direction).

## The owner's direction (latest, overrides earlier docs)
1. **Don't copy Dark's names.** "Season/episode" is gone everywhere. The middle layer is **"Platform"** (internal world key is still `origin`;
   case codes are **M** mobile / **P** platform / **C** cloud). Keep Dark's *look*, invent our own meaning.
2. **The track page IS a full-viewport canvas** — like Dark's family tree, nothing scrolls. No hero block, no featured card, no list underneath.
   → Implemented as the **layered 3D map** (`Scene.astro`). Owner wants it *genuinely impressive, uncluttered, 3D, draggable*. Keep pushing quality.
3. **Short titles on the map** (content field `short`, ≤14 chars, per language). Never truncate with "…".
4. **Intro = one seamless experience: language + world**, not a form. Owner's idea: an **∞ (infinity) that draws itself, a light orbiting it**,
   then something beautiful. This is the owner's #1 priority for "wow". *Not built yet* — see "Next" below.
5. Mobile must look great. Commit after each finished step. Open any `.md` you write in nvim in the tmux `nvim` window (owner preference).

## What exists now
| Area | Files | Notes |
|---|---|---|
| i18n EN/DE/AR + RTL | `src/i18n/*` | `t/loc/url/dir`; DE/AR copy is a draft, owner reviews. New keys: `phase.s1-4`, `map.*`, `intro.*`. |
| Content | `src/content/projects/*.yaml`, schema `src/content.config.ts`, helpers `src/lib/content.ts` | 7 nodes. `featuredForTrack` = highest-weight `featured` node in-world (Qanony→mobile, HOPE→cloud/all). |
| Asset pipeline | `tools/assets/*`, specs in `assets-src/<slug>/{shots,diagram}.yaml`, output `public/projects/<slug>/` (committed) | `npm run assets [-- slug]`. Outputs: `cover.webp` (devices right, **no baked text**), `cover-rtl.webp` (mirrored), `cover-portrait.webp`, `thumb.webp`, `gallery/NN.webp`, `og.png` (captioned, for link previews), `sigil.svg`. Raw screenshots gitignored. |
| **3D map** | `src/lib/scene.ts` (pure layout, tested), `src/components/Scene.astro` (SSR CSS-3D scene + chrome), `src/scripts/scene-camera.ts` (camera/interaction) | See "How the map works". |
| Track page | `src/pages/[lang]/[track]/index.astro` | Just `<Base immersive><Scene/></Base>`. |
| World chooser | `src/pages/[lang]/index.astro` | Hover-widen columns. **To be replaced by the ∞ intro.** |
| Root | `src/pages/index.astro` | JS language redirect. **To be replaced by the ∞ intro.** |
| Layout | `src/layouts/Base.astro` (`immersive` prop → floating header, no footer, no scroll), `Header.astro` (`floating`), `Footer.astro`, `Sigil.astro` | |
| CI | `.github/workflows/deploy.yml` | GitHub Pages. No `public/CNAME` yet (owner hasn't confirmed DNS). |

### How the map works (Scene)
- World axes: **x = time**, **y = across a plane**, **z = layer height** (mobile +330, platform 0, cloud −330). `layoutScene()` returns planes, cards,
  beams (with CSS rotations precomputed by `beamGeometry`, unit-tested), skills (engraved on the layer that uses them most, 1-D packed so they never overlap), years.
- SSR renders everything with CSS 3D at a default camera → works without JS. The camera is only CSS vars on `.stage`:
  `--fx --fz --yaw --pitch --zoom` (+ `--ox --oy` screen offset, `--fit-zoom`, `--card-k` per breakpoint).
- Cards are **billboards**: `rotateZ(-yaw) rotateX(-pitch) scale(k/zoom)` → always face the camera at constant screen size (crisp, readable).
- Interaction (`scene-camera.ts`): drag = pan time (x) + layers (z) with momentum; Shift/right-drag = orbit; pinch / ⌘-wheel = zoom;
  mouse wheel = time; trackpad = x/z; arrows/+/-. **First click selects** (panel + lighting + fly-to), **second click opens**. Keyboard focus selects, Enter opens.
  Hover lights the project's skills, beams and neighbours (`[data-for]`, `.is-lit`, `.stage.has-focus`). Year rail + phase name, zoom/reset/Index controls,
  idle yaw sway, dust canvas with parallax. Reduced motion: no fling/sway/flow.
- Gotchas already solved: capture the pointer only after a 5px drag (capturing on press eats card clicks); `:global()` for script-injected panel markup;
  `.world, .world * { direction: ltr }` so RTL doesn't flip the 3D world (time is mirrored in the layout instead).

## Known issues / polish to do on the map (do these first)
1. **Framing**: verify the camera starts with the featured card centred and fully visible on desktop (panel on the right takes ~340px → `--ox:-150px`)
   and on phone (bottom sheet → `--oy`). Tune `--fit-zoom`, pitch (54°) and yaw (−14°) by screenshot at 1440×900, 1280×720, 390×844, 320×640.
2. **Cards without art** (P01/P02/AWS) show a big letter on an empty tile — make them a designed "badge" (sigil + world colour), not a placeholder.
3. Cloud thumbs (terminal crops) are low-contrast at card size — consider using the sigil or a cropped diagram node instead.
4. Engraved layer names are huge and partly off-plane at some yaw values; make sure each is readable once on screen (maybe repeat every ~2 years of x).
5. Phone: rail and controls share the bottom with the sheet; check nothing overlaps at 320px. Consider vertical drag = move between layers (already the behaviour) + a layer indicator.
6. The map only spans 2024–2027 because content only goes back to 2024 — adding the older nodes (below) fills it out.
7. Card "Open project" links go to `/{lang}/{track}/p/{slug}/` — **those pages don't exist yet (404)**. Build dossiers soon (Phase 6 in plan.md).

## Next, in order
1. **Dossier pages** `src/pages/[lang]/[track]/p/[slug].astro` (spec D4): `cover`/`cover-rtl`/`cover-portrait` via `<picture>`, short+full title, impact,
   Problem/Built/Result, gallery (snap-scroller on phone), stack chips, connected projects, prev/next. Must not 404 from the map.
2. **The ∞ intro** (owner's top wish), replacing `src/pages/index.astro` and `src/pages/[lang]/index.astro`:
   - A lemniscate (∞) path draws itself (stroke-dashoffset), a glowing light orbits it with a fading trail (canvas). Left lobe = Mobile (amber),
     right lobe = Cloud (cyan), the crossing = Both (white-gold). Name fades in beneath.
   - **Step 1 language**: "English · Deutsch · العربية" around/below the ∞, detected language pre-highlighted; the hint line cross-fades
     "Choose your language / Wähle deine Sprache / اختر لغتك". Choosing it re-labels everything in place (no page load), unpicked words dissolve into the loop.
   - **Step 2 world**: lobes light up with localized labels; hovering a lobe makes the light orbit only that lobe; clicking a lobe zooms into it
     (accent wash) → navigate to `/{lang}/{track}/`. Offer "Last time: Mobile · English" from localStorage.
   - No-JS fallback: plain links (`/` → language links to `/{lang}/`; `/{lang}/` → world links). Skip link + CV link always visible. Reduced motion: static ∞.
   - Use cross-document View Transitions (`@view-transition { navigation: auto; }`) so the intro → map hand-off is seamless.
3. Remaining content (owner confirmed): **EHC Board** (screens in `~/Downloads/the_egyptian_board_screenshots`), **Heaven Flowers**
   (`~/Downloads/heaven_flower_screenshots` are pre-framed store images), **Bioot** (2 apps, no screenshots), **Yafleet** (no code),
   older nodes for 2019–2023 (IEEE Flutter lead 2020, freelance 2022–24, EGPI simulator, Al3wn). Facts + links in `docs/content-intake.md`.
4. Phase 7 in plan.md: HTML + PDF CVs per track/lang, colophon page, OG images, Lighthouse/link-check in CI.

## Running things
- Use the tmux window `claude_work` in session `dark` for builds/servers (never window 1).
- Preview a build: `cd dist && python3 -m http.server 8000 --bind 0.0.0.0` → `http://localhost:8000/en/mobile/` (**trailing slash**).
  `astro dev`/`astro preview` run as managed daemons in Astro 7 and sometimes hold the port — `npx astro dev stop` / `npx astro preview stop`.
- Screenshots for checking: a Playwright snippet must run from the project root (to resolve `playwright`): copy it in as `_snap.mjs` (gitignored) and delete after.
- Assets: `npx tsx tools/assets/render.ts [slug]`.
