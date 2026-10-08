# Next steps — review of the live site (2026-10-08)

**Live:** https://mohamed-h-essa.github.io/portfolio/ · repo: https://github.com/Mohamed-H-Essa/portfolio
Every push to `main` redeploys (GitHub Actions → Pages, ~1 min).

Answer inline (like owner-todo); short answers are fine. ★ = blocks something visible.

---

## 1. Decisions only you can make

- [ ] ★ **Which portfolio is "the" portfolio?** `mohamed-h-essa.github.io` (root) still serves your older site
      ("Flutter Developer / AWS & DevOps"); this one lives at `/portfolio/`. Two portfolios confuse recruiters, and
      search engines only honour `robots.txt`/`llms.txt` at the domain root. Options:
      (a) replace the old one: I move this to the root repo (old site stays in git history, nothing is lost);
      (b) keep both for now; (c) buy a domain (~€10/yr) and point it here; then it's `BASE_PATH=/`.
      My pick: **(a)**, once the CV pages exist.
- [ ] ★ **CV pages.** The CV button and "How this site is built" are hidden until those pages exist (no 404s).
      Your PDF is out of date (mecodes, dates, phone). Should the site generate the CV from the same content
      (one per track × language, plus a printable PDF)? That's the plan's Phase 7 and the biggest missing piece.
      Which phone number, if any, goes on it?
- [ ] **Photo** on the site / CV? (`assets-src/_photo/mohamed.png` exists; German CVs usually have one, the map doesn't need one.)
- [ ] **Analytics:** you wrote "NaN", so none for now. Fine; revisit when you start applying.

## 2. Facts I need checked

- [ ] ★ **Years of experience:** the Mobile subtitle says "Five years shipping production Flutter apps"; your CV
      says "3+ years (2 freelance + 2 in-house)". It's on the map, the link previews and llms.txt. Which is true?
- [ ] **Intrazero start:** Aug 2024 (CV) or May 2024 (LinkedIn)? **Freelance:** Jun 2022 – Jul 2024 or Jan 2022 – Dec 2024?
- [ ] **Title:** "Senior Mobile Engineer" (site/LinkedIn) vs "Flutter Developer" (CV): same everywhere?
- [ ] **Release pipeline:** do the pipelines run tests? (adds a "Test" step to the diagram)
- [ ] **Any numbers** you can defend (crash-free %, downloads, release time before/after, rebuilds −87 % from LinkedIn?).
      Projects with a number get a big figure on their page.
- [ ] **Yafleet:** build dates + stack. **EHC Board:** "sole/lead developer"? **Bioot:** more than the release work?
      **Heaven Flowers:** start month.
- [ ] **Translations:** DE and AR are rewritten to the conventions in `docs/translation.md`, but a native read-through
      catches what I can't. Skim one project page in each language and tell me anything that sounds off.

## 3. Graduation, IEEE instructor, Linux / networking courses: what I think

**Yes to graduation and the IEEE Flutter work; no to the courses as timeline items.**

- The map currently starts in 2024, so everything before Intrazero is invisible. **Graduation (Benha, 2024)**,
  **Head of the IEEE Flutter committee (2020)** and **Flutter instructor (IEEE, teaching a curriculum)** are
  *milestones with evidence*: they show where you came from, and teaching is a strong seniority signal. They also
  fill the empty early years honestly.
- They should look **different from projects**: small flag markers on the time axis (a "milestone rail"),
  with a one-line label on hover and no project page. That keeps the map a map of *work*, with life events as
  landmarks, not cards competing with Qanony.
- **Networking basics / Linux basics / a book: not as nodes.** You're right about the risk: a run of courses next
  to a thin Cloud lane reads as "a timeline of learning", which advertises the thinness. Courses are inputs; recruiters
  look for outputs. Instead:
  - **Linux, 6 years daily:** a skill in the Cloud/Platform stacks and a line in the CV skills ("Linux: daily
    driver since 2020"). That's a stronger claim than a "basics" certificate.
  - The courses and the book go in the CV under "Learning" (one line), not on the map.
  - The **AWS certification stays a node**: it's externally verified (Credly) and it's the anchor of the Cloud story.
- What actually thickens Cloud credibly: **Nilefy** (118 commits of NestJS backend: encryption module, export/import,
  REST connector; public on GitHub), the **form-orchestration engine** (Platform), **HOPE** and **German Sync**
  (already there), and later the **k8s homelab** once it's something you'd demo.
- [ ] If you agree: graduation **month**, IEEE committee **dates**, instructor **dates**, and whether "best Flutter student 2021" should appear.

## 4. Missing, in the order I'd build it

1. **CV pages + PDF** (Phase 7): generated from the content, per track and language, ATS-safe print layout.
2. **Milestone rail** (above) + the early nodes: Freelance (role), IEEE, graduation, EGPI simulator, Al3wn.
3. **Content that strengthens Cloud/Platform:** Nilefy, form engine, (Medical Waste, UNICEF if you send screens).
4. **Contact on the map.** The map (the page most visitors land on) has no visible email or LinkedIn; they live in
   the footer of project pages and the phone menu. A small "Contact" chip in the map's chrome would fix it.
5. **Quality gates in CI:** link check + Lighthouse budgets (perf ≥ 90, a11y ≥ 95) so a future change can't silently break things.
6. **Domain / root decision** (section 1), then submit the sitemap to Google Search Console.

## 5. UI review: what I'd still improve

What works: the intro (strongest moment), the map's hand-off into a project, the engine frames, the open-book viewer,
Arabic RTL throughout. No console errors and no horizontal scroll. Seven of nine pages I timed loaded in 0.6–1.3 s; two cold loads took
3.1 s and 5.0 s (first fetch of fonts and scripts), worth a Lighthouse pass.

- **First-time map users** may not realise cards are clickable before they read the hint. A one-time gentle
  "pulse" on the featured card after ~2 s of no interaction would teach it without words.
- **Thin projects** (Yafleet: no screens, no stack) make a sparse project page. Either enrich them (screens, stack) or
  give badge-only projects a shorter page (just the overview frame + details).
- **Badges all look alike** (three rings). Fine for now; a per-kind variation (role, cert, platform) would help once
  the early nodes arrive.
- **Arabic long titles on desktop** still touch the art on very long names; acceptable now, best fixed with
  shorter titles in AR (e.g. "بيوت" as the title, the description as the impact line).
- **Phone map:** the panel covers the lower third; consider a swipe-down to minimise it.
- **The HUD rail** sits over the art on project pages; on light screenshots its ticks are low-contrast.
- **CI warnings:** GitHub will drop Node 20 actions; I'll bump `actions/*` versions in the next deploy change.
