# AGENTS.md — read this first

You are implementing a portfolio site whose design was planned by a stronger model and approved by the owner.
**Your job is execution, not redesign.**

## Read order
0. **`docs/HANDOFF.md` — latest state + the owner's newest direction (overrides older docs where they disagree)**
1. `docs/spec.md` — what we're building and why (decisions D1–D9 are final)
2. `docs/plan.md` — ordered phases with checkboxes. Find the first unchecked box and continue from there.
3. `docs/assets.md` — screenshot → visuals pipeline (Phase 3)
4. `docs/content-intake.md` — how to document a project, the known projects, and the owner's facts
5. `docs/dark-reference.md` — what we borrowed from dark.netflix.io (mood only, no copying)
6. `docs/owner-todo.md` — open questions for the owner; add to it instead of guessing

## Rules
- **Never invent facts or metrics** about the owner's work. Unknown → `docs/owner-todo.md`.
- Mobile first: build and check every screen at 390 px and 320 px before desktop. No horizontal scroll, tap targets ≥ 44 px.
- RTL: Arabic is `dir="rtl"`. Use logical CSS properties only. Mirror the timeline direction.
- Every page must work with JS disabled. JS only enhances (map, transitions, particles).
- Respect `prefers-reduced-motion` everywhere animation exists.
- Hosting is GitHub Pages: static output only, no server features; all internal links go through the `url()` helper.
- Keep files small and single-purpose (components < ~200 lines). Prefer plain CSS + Astro components; the only runtime libs are GSAP and what the plan lists.
- Don't add sound, a CMS, a blog, a light theme, WebGL scenes or a Flutter Web build (spec §5).
- Don't read whole codebases in `~/work/*`. Read README, manifests, workflows, folder names, git log.
- View screenshots downscaled (`sips -Z 600 in --out .cache/x.png`) to save tokens.
- Raw screenshots (`assets-src/*/raw/`) are gitignored; generated `public/projects/**` are committed.
- After each phase: `npm run check && npm run build`, look at it at the three widths in en + ar, tick the boxes in `docs/plan.md`, commit.
- If something in the spec seems wrong, write it in `docs/decisions-log.md` with your proposed alternative and ask the owner. Don't silently deviate.

## Owner's environment
- Run dev servers, builds and long commands in the tmux window `claude_work` of the current session (ask before creating it;
  never use window 1). Keep scrollback.
- Owner: Mohamed H. Essa. Pronouns aren't stated. Write "the owner" or use they/them.
