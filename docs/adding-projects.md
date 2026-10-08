# Adding a project

A project on this site is three things: a **content file** (facts, in three languages), optional **source art**
(screenshots or a code/cloud diagram spec), and the **generated visuals** the asset pipeline makes from that art.
Everything else follows automatically: the card on the 3D map, the selected-project card (with its image cycling), the
project page with its frames, the hand-off animation, the prev/next links, the sitemap and `llms.txt`.

`docs/content-intake.md` is the fact sheet (what we know about each project and where it came from). This file is the
how-to.

---

## What to send me (the owner's part)

For each project, the minimum is a few honest facts. Screenshots make it shine, but they're optional.

| Need | Example | Required? |
|---|---|---|
| Name, and a short name ≤ 14 characters for the map | "Medical Waste System" / "MedWaste" | yes |
| When (month + year) and whether it's still going | 2024-09 → present | yes |
| Your role | "Flutter developer" | yes |
| One line of impact, only if it's true and you'd defend it in an interview | "Digitised waste tracking across 600+ facilities" | yes |
| Problem / what you built / result (≤ 60 words each) | | yes |
| Stack | Flutter, BLoC, Dio | yes |
| Links: App Store, Google Play, GitHub, live site | | if public |
| A number, if one exists and you can stand behind it | "−83 % report time" | optional |
| 4–8 screenshots, or for code/cloud work a terminal snippet + the boxes of an architecture diagram | | optional |

**Screenshots:** release build, no debug banner, demo or neutral data (no real names/IDs), one device size, PNG or JPEG
straight from the phone or simulator (not store frames with marketing text; if that's all there is, say so). Say which
one is the "hero" (the screen that explains the app best).

Drop them in a folder anywhere (e.g. `~/Downloads/<project>_screenshots`) and tell me the path.

---

## Step by step (the implementer's part)

### 1. The content file

```bash
cp src/content/projects/_template.yaml src/content/projects/<slug>.yaml
```

Fill it in. The fields that shape the site:

| Field | What it does |
|---|---|
| `slug` | URL (`/en/mobile/p/<slug>/`), asset folder name. Lowercase, dashes. |
| `kind` | `project`, `role` or `cert`. A cert gets a hexagon badge and a "Verify credential" link. |
| `worlds` | Layers it belongs to; the **first** is the layer its card stands on: `mobile`, `origin` (shown as "Platform"), `cloud`. |
| `start` / `end` | Position on the map's time axis (`YYYY-MM`, `end` may be `present`). |
| `weight` | Per track 0–3. **0 = dimmed** on that track; the highest-weight `featured` node in a track is where the map starts. |
| `code` | `M`/`P`/`C` + two digits, unique (next free: check `grep -h '^code' src/content/projects/*.yaml`). |
| `short` | The name on the map card (≤ 14 chars, never truncated). |
| `connects` | Slugs this project links to: draws a beam on the map and appears under "Connected to" (both directions). |
| `visual` | Optional built-in diagram for the project page (today: `release-flow`). |
| `review` | `{ de: true, ar: true }` until the owner has read the translations. |

Write `en` for every localized field; add `de`/`ar` drafts (they fall back to English with a build warning). Never invent
a number; if unsure, leave `impact.metric` out and add a question to `docs/owner-todo.md`.

### 2. The art (optional)

**App with screenshots:** copy the raw captures to `assets-src/<slug>/raw/` (gitignored; they may contain client data) and
write `assets-src/<slug>/shots.yaml` (see `assets-src/qanony/shots.yaml`):

```yaml
device: iphone          # or android
accent: auto            # sampled from the hero screen; or "#7a5af8"
world: mobile
title: Qanony
code: M01
impact: A bilingual legal-services app, live on both stores
shots:
  - file: "home.png"
    role: hero          # exactly one
  - file: "wizard.png"
    role: gallery       # 3–6 of these
```

**Code / cloud project:** write `assets-src/<slug>/diagram.yaml` (see `assets-src/hope-glove/diagram.yaml`): a short
terminal snippet (`code: |`) and the diagram's `nodes` and `edges`.

**Nothing at all:** skip this step. The project gets a designed **badge** (its sigil in its layer colour) everywhere a picture
would go.

### 3. Generate the visuals

```bash
npm run assets -- <slug>      # writes public/projects/<slug>/ (commit it)
```

Output: `cover.webp` + `cover-rtl.webp` (desktop hero, devices on the inline-end side, no text), `cover-portrait.webp`
(phone hero), `thumb.webp` (map card), `gallery/NN.webp` (project-page screens, and the cycling images on the selected
card), `og.png` (link previews), `sigil.svg`. Check the quality list in `docs/assets.md`.

### 4. Check it

```bash
npm run check && npm run build
cd dist && python3 -m http.server 8000 --bind 0.0.0.0
```

Look at, in en and ar, at 1440 / 390 / 320 px:
- `/en/<track>/`: the card sits on the right layer at the right time and doesn't hide another card; selecting it frames it,
  and hovering the selected-project card cycles its screens.
- "Open project": the art flies into the project page without a jump; the frames (Overview → Story → … → Details) step
  with wheel / swipe / ↑↓.
- `/en/<track>/p/<slug>/` with JavaScript off: a normal scrolling page with everything on it.

Commit: `feat(content): <slug>`.

---

## Still missing (from the CV + the intake sheet)

Ticked when the content node exists. ❓ = needs a fact or permission from the owner first.

- [x] Qanony · ARATC · Release pipeline · App security · HOPE glove · German Sync · AWS SAA
- [ ] **Medical Waste Management System** (Ministry of Health, 600+ facilities, multi-level approvals), screenshots ❓
- [ ] **UNICEF child-protection case management** (offline-first delayed sync, dynamic forms), screenshots ❓
- [ ] **Form-orchestration engine** / `flutter_form_engine` (public repo): a natural Platform node
- [ ] **Motary** and **Al-Diplomacy** e-commerce (UAE / Oman): store links ❓
- [ ] **Nilefy** open source (118 commits, encryption module, export/import, REST connector): a Platform/Cloud node with a
      GitHub link; strong backend signal
- [ ] **wfm** (Riverpod 2, Dio/Retrofit, Hive, biometrics, FCM) and **star_wars_land** (Clean Architecture reference,
      30 test files, CI): public repos
- [ ] **Heaven Flowers** (screens are store frames ❓), **EHC Board** (5 clean screens ready), **Bioot** (two apps, no
      screens ❓), **Yafleet** (no code ❓)
- [ ] Older timeline: **Freelance** role node, **IEEE Flutter** (committee head 2020, instructor), **EGPI simulator**, **Al3wn**
- [ ] Dates disagree between sources: see `docs/owner-todo.md` ("CV vs LinkedIn dates")
