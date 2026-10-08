# Asset pipeline: raw screenshots → Dark-styled project visuals

Goal: every project gets a consistent, cinematic set of visuals generated **by code** from raw
screenshots, so adding a project never needs Photoshop. Re-running the command regenerates everything.

Reference implementation to learn from (read it, don't copy it blindly):
`~/work/qanony_flutter/tools/` — `make_screenshots.py` (layout system), `device.py` (device frame,
tilt, drop shadow, gradients, radial glow), `typo.py` (Arabic shaping), `copy.py` (frame plan as data).
The output is in `~/work/qanony_flutter/store_output/en/`. Look especially at **02 + 03**: one tilted device spans two
frames. That "oversized device bleeding off the edge" look is the quality bar.

## Decision: HTML templates rendered by Playwright (not Pillow)
Playwright is already a dependency (CV PDFs). HTML/CSS gives us 3D transforms, blur, gradients,
masks, our real web fonts and native Arabic shaping for free. Pillow needed `arabic-reshaper` + `python-bidi`
and still lacked glyphs (see the qanony README note about em dashes). Image cleaning uses `sharp`.
Everything is Node/TS, one toolchain.

```
assets-src/<slug>/raw/          ← owner drops screenshots here (any names)
assets-src/<slug>/shots.yaml    ← implementer writes: picks, roles, crops, masks
tools/assets/clean.ts           ← sharp: normalize, status bar swap, masks → .cache/<slug>/clean/
tools/assets/templates/*.html   ← one HTML template per output kind
tools/assets/render.ts          ← Playwright: template + data → public/projects/<slug>/*.webp
npm run assets [-- <slug>]      ← all projects, or one
```
Generated files go to `public/projects/<slug>/` and are **committed** (Pages builds then need no browser
for assets). `.cache/` is gitignored.

## Step 1 — Pick the screens (shots.yaml)
Look at every raw screenshot (view them downscaled, e.g. `sips -Z 600`, to save tokens) and choose 4–6:
- 1 **hero** screen: the most characteristic, information-rich, colorful screen (home/dashboard/detail with an image).
- 3–5 **gallery** screens that tell the product's story in order (onboarding → core action → result).
- **Reject** screens with: test or junk data ("QA …", "test", "Notification Trainer", lorem ipsum, "asdf"),
  placeholder avatars, empty states, error toasts, open keyboards, loading spinners, debug banners.
- If fewer than 3 clean screens exist, still produce visuals from the best ones, and add an entry to `docs/owner-todo.md`:
  "Recapture <slug> with demo data and `debugShowCheckedModeBanner: false` + flavor banner off".
  (A seeded integration test like `qanony_flutter/integration_test/screenshots_test.dart` is the best long-term fix.)

```yaml
# assets-src/aratc/shots.yaml
device: iphone-16-pro        # iphone-16-pro (1206x2622) | android (any) | web (any landscape)
accent: auto                 # auto = derive from the app's brand color on the hero screen, or a hex
shots:
  - file: "Simulator Screenshot - iPhone 16 Pro - 2026-09-26 at 03.08.43.png"
    role: hero               # hero | gallery
    caption: { en: "Course details at a glance", de: "…", ar: "…" }
    masks:                   # optional rectangles to paint over (x,y,w,h in source px), fill = sampled neighbour color
      - { x: 1000, y: 0, w: 206, h: 210 }   # "LOCAL" debug ribbon, top-right
```

## Step 2 — Clean (tools/assets/clean.ts, sharp)
1. Detect the device by size. iPhone 16 Pro = 1206×2622 @3x; status bar ≈ top 162 px.
2. Replace the status bar strip with a clean rendered one (time `9:41`, full signal/wifi/battery, color matched
   to the sampled background: light or dark icons by luminance). This also removes most debug ribbons.
3. Apply `masks` (fill with the median color of a 6 px ring around the rect).
4. Android/WhatsApp JPEGs: no upscaling. Keep them only if ≥ 1000 px wide, otherwise reject them and add an owner TODO.
5. Output a PNG to `.cache/<slug>/clean/NN.png`.

## Step 3 — Render (templates)
All templates share the **Dark ground**: `#080808` base, a 4 % film-grain noise (inline SVG feTurbulence),
a large soft radial glow in the project accent at ~18 % opacity (off-center, like qanony's `radial_glow`),
a faint oversized project **sigil** watermark bled off one edge (5 % opacity), and a subtle 1 px horizon line.
Screenshots themselves stay true-color (legibility). Only the ground and the thumbs get the Dark grade.

| Output | Size | Used for | Composition |
|---|---|---|---|
| `cover.webp` | 1600×900 | Dossier hero (desktop), map node hover preview | 3 devices: center = hero screen, tilted `rotateY(-14deg) rotateZ(4deg)`, scaled so it bleeds off the bottom; two gallery devices behind it, smaller, `blur(2px)`, 70 % brightness (depth of field). Accent glow behind the center device. |
| `cover-portrait.webp` | 1080×1350 | Dossier hero on phones, social | One hero device, tilted, ~1.6× scale, bleeding off the bottom-right (bottom-left in mirrored mode) — the qanony 02 look. |
| `thumb.webp` | 480×600 | Map node / phone timeline card | Dark "character portrait": crop of the top 55 % of the hero device at a slight tilt; ground graded `saturate(.7) contrast(1.08)` + a cool shadow tint + vignette; a 1 px accent rim light on the device edge. |
| `gallery/NN.webp` | 720 w | Dossier gallery | Each clean screen in a flat device frame (rounded corners, thin bezel) on a transparent → `#080808` background. |
| `og/<lang>.png` | 1200×630 | Link previews (LinkedIn!) | The cover composition on the right 60 %; left: case code (`M-03`), project title, one-line impact in the page language. AR mirrors the layout (`dir="rtl"`). |
| `sigil.svg` | — | Watermark + dossier badge | Generated: project initials inside an arc fragment of the triquetra, rotated by a hash of the slug. Deterministic. |

Projects **without screens** (Cloud/infra repos): use the `cover-cloud` template instead. A dark "terminal" window
(JetBrains Mono, a real 8–14 line snippet from the repo: `terraform plan` summary, `kubectl get pods`, a GitHub Actions log)
layered in perspective over an architecture diagram drawn as inline SVG (boxes + flowing dashed edges, cyan accent).
Write the diagram data as YAML in `assets-src/<slug>/diagram.yaml` (nodes + edges). Never invent services the repo
doesn't use. Thumbs for these use the diagram crop.

Site-level OG images: `public/og/<lang>-<track>.png` (9 files) with name, title for the track, and world accent. Same template family.

## Accent color
`accent: auto` = sample the hero screenshot, take the most saturated dominant color (k-means k=5 via sharp stats or a tiny
quantizer), clamp lightness to 55–65 % so it glows on black. If the result is near grey, fall back to the world accent
(mobile `#E8B23A`, cloud `#5DB8D6`, origin `#EDE6D6`).

## Quality checklist (do this for every project before marking it done)
- [ ] Open `cover`, `cover-portrait`, `thumb` at 100 % and at phone size. No debug ribbon, no test data, no clipped status bar.
- [ ] The device tilt reads as one plane (no warped text), the shadow is soft, the glow isn't banding (add grain if it bands).
- [ ] `og/ar.png` reads right-to-left and Arabic text is joined (not isolated letters).
- [ ] File sizes: cover ≤ 180 KB, thumb ≤ 40 KB, gallery ≤ 90 KB each (webp q≈78).
