# Decisions log

Append-only. Date · decision · why · who approved.

- 2026-10-08 · Spec D1–D9 approved (two worlds, world chooser, DOM/SVG timeline, EN/DE/AR, recruiter fast path) · see spec.md · owner
- 2026-10-08 · Hosting = GitHub Pages (not S3/CloudFront) · owner's choice · owner
- 2026-10-08 · Mobile is a first-class design target (spec D8b) · owner's requirement · owner
- 2026-10-08 · Asset generation via HTML templates + Playwright, not Pillow · one toolchain, native Arabic/3D/fonts · planner
- 2026-10-08 · Dropped Dark's "season/episode" naming; middle layer renamed "Platform" (codes M/P/C) · owner: names must make sense to recruiters · owner
- 2026-10-08 · Track page = full-viewport layered 3D map (custom CSS-3D engine), replacing hero + featured card + 2D timeline · owner asked for an immersive, uncluttered, draggable 3D page · owner
- 2026-10-08 · Intro to become one ∞-based language + world experience · owner's top priority · owner
- 2026-10-08 · Dossiers run in "engine mode": no page scroll, full-screen frames (Overview → Story → Pipeline/Screens → Details) moved by wheel/swipe/keys with a HUD (rail, counter, next cue); no-JS = normal scrolling page · owner asked for game-engine-like, HUD-driven navigation instead of manual scrolling · owner
- 2026-10-08 · Map → dossier opens with a JS hand-off (the card art flies to the exact hero rect, the map dissolves, then navigate) instead of a View-Transitions morph · must work in every browser (Firefox has no cross-document VT) and be seamless · owner
- 2026-10-08 · No custom domain: the owner no longer has mecodes.live (never use it). Site defaults to GitHub Pages `https://mohamed-h-essa.github.io` (`SITE_URL` overrides); contact email is mhosnytech@gmail.com · owner's answer in owner-todo · owner
- 2026-10-08 · Interface sound added (spec §5 had excluded it): synthesised with Web Audio (no files), silent until the first click/key, very low level, speaker toggle remembered per visitor · owner asked for subtle, tactile sound that follows the animation · owner

## 2026-10-30 — Keep the 3D canvas; give it room (branch `feat/canvas-spacing`)
The owner rejected the scrolling timeline (`feat/timeline`): the canvas is the experience. Fixes inside the canvas
instead (`lib/scene.ts`, `Scene.astro`): a month is 70px (was 34); same-layer cards stand ≥196px apart (a billboard
is ~170 world px on screen) and a crowded group is spread *around* its members' true dates (`spread()`), not pushed
into the future; each project's dot sits on its true month with a floor line to its card; every other year is
tinted on the floor and year labels are bigger; a year with no project gets no label or rail entry (no empty 2027);
the title block has a soft shadow so the floor recedes under it. Overlap probe: none at 1440/1280/390/320, en + ar.

## 2026-10-30 — The map opens on each track's newest project
Owner: "why does it always start at Qanoni". The map used to open on the highest-weight `featured` node (Qanoni on
Mobile, HOPE on Cloud/Both), mid-timeline. Now `newestForTrack()` (lib/content.ts) picks the newest on-track project
(Leem on Mobile and Both, German Sync on Cloud), so the timeline reads from now backwards. `?p=<slug>` still wins.
