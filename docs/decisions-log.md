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
