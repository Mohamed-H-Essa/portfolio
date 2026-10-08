# What we learned from dark.netflix.io

Source: a saved copy at `~/Downloads/DARK _ The Official Guide _ NETFLIX.html` (+ `_files/`). Live: https://dark.netflix.io/en
**Do not copy any Netflix asset, image, text, logo or code.** This is mood and mechanics only.

| Feature | How Dark does it | What we do instead |
|---|---|---|
| Stack | Vue 2 + Vuex + vue-router, GSAP, Howler (sound), Lottie (logo), custom WebGL engine | Astro static + small TS islands + GSAP |
| Spoiler filter | Vuex `user.spoilerFilter = {season, episode}`; a router guard redirects items "after" your episode | World chooser `{track}` in the URL (spec D1) |
| Background | A WebGL point cloud ("dark matter") with additive-blend glow, flares and lines | Canvas2D particles + accent glow (D6) |
| Page transitions | Enum `FADE, RIPPLE, RIPPLE_UP, RIPPLE_DOWN, RIPPLE_DARK` | View Transitions ripple / crossfade |
| Entities | Who (characters `C##.webp`), What (objects `O##.webp`), When (years 1888…2053), family tree with lines | Projects / roles / certs as nodes, typed edges |
| Images | Muted, desaturated, cool-graded portraits ~250×330 webp | Our thumbnails get the same grade (see assets.md) |
| Easing | `cubic-bezier(.455,.03,.515,.955)` (38 uses), `.785,.135,.15,.86`, `.25,.46,.45,.94` | Same values as tokens |
| Colors | `#080808`, `#000`, `#fff`, black overlays at .5/.15 | Plus one accent per world |
| Type | Open Sans UI, **Tajawal for Arabic**, spaced uppercase labels (`label-xs…l`) | Space Grotesk / JetBrains Mono / Tajawal |
| i18n | `<html class="locale-en" lang dir>` | Same, with RTL done properly |
| Mobile | Forces landscape ("rotate your device") | **Don't.** Vertical timeline on phones |
| Loading | Full-screen preloader with % | **Don't.** Content first, enhance after |
| Keyframes worth echoing | `dashed-line`, `pulse`, `triquanta-rotation`, `scroll-indicator` | Edge flow, node pulse, logo spin, scroll hint |
