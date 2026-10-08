# Documenting a project (content intake)

One project = `src/content/projects/<slug>.yaml` + `assets-src/<slug>/`. The schema in `src/content.config.ts`
validates it at build time. The template is `src/content/projects/_template.yaml`.

## Where facts come from
1. **The owner's words** (chat, LinkedIn text in `docs/spec.md` and the owner's profile below). Highest priority.
2. **The code** in `~/work/<repo>`. Read `README*`, `pubspec.yaml` / `package.json`, `.github/workflows/*`,
   `infra/` or `*.tf`, `lib/` folder names, and `git log --oneline | head -50` for dates. Don't read the whole codebase.
   Extract: stack, architecture, notable engineering (offline-first, state management, security, CI/CD, IaC), dates.
3. **Screenshots** for what the product does.

**Never invent metrics.** If a number isn't stated by the owner or provable from the repo, leave `impact.metric` empty and
write a qualitative impact. Collect missing facts as questions in `docs/owner-todo.md` (grouped by project) for the owner to answer
in one pass.

## Writing rules
- Problem → Built → Result, each ≤ 60 words, active voice, first person, concrete nouns. No "leveraged", "robust", "seamless".
- `impact.line` is ≤ 12 words and starts with the outcome: "Cut annual report generation time by 83 %".
- Every project picks `worlds` (one or more of mobile / cloud / origin) and a `weight` per track (0–3) that sets order and emphasis.
- Confidential clients (UNICEF, government): only describe what's public, set `confidential: true`, and ask the owner before publishing screenshots.
- DE/AR: write natural translations. Mark them `review: true` until the owner approves them (shown nowhere, just tracked).

## Known projects (from the owner's LinkedIn, 2026-10-08). Confirm the list with the owner.
| Slug | World(s) | Era | Facts we have | Source |
|---|---|---|---|---|
| unicef-case-management | mobile, origin | S3 | Flutter case-management app for case workers; form-heavy, offline | LinkedIn (confidential) |
| aratc | mobile | S3 | Flutter, iOS + Play; screenshots in `~/Documents/aratc screenshots` (17, iPhone 16 Pro, contain test data + LOCAL ribbon) | `~/work/aratc`, also `~/work/aratc_aws` (cloud side?) |
| heaven-flowers | mobile | S3 | Play Store app | LinkedIn |
| qanony | mobile | S3 | Legal-services app, EN/AR, polished store screenshots already exist | `~/work/qanony_flutter` (`store_output/`, `store_screenshots/`); `~/Documents/qanoni screenshots` is **empty** |
| release-pipeline | origin | S3 | GitHub Actions CI/CD, signing, store submission; multi-day → same-day releases | LinkedIn |
| mobile-security-hardening | origin | S3 | Cert pinning, obfuscation, MobSF, root/jailbreak + debug detection | LinkedIn post |
| bloc-performance | mobile | S3 | Bloc/Cubit refactor, 87 % fewer rebuilds, low-end Android | LinkedIn |
| egpi-simulator | origin | S2 | Heavy machinery data simulator for EGPI; Node + Drizzle; report time −83 % | LinkedIn |
| al3wn | mobile | S2 | Educational app, Flutter + Firebase realtime, concept → launch | LinkedIn |
| ieee-flutter | mobile | S1 | Head of IEEE Flutter committee 2020; instructor 2023; best Flutter student 2021; GDSC tech support 2022 | LinkedIn (a role node, not a project) |
| aws-saa | cloud | S4 | AWS Certified Solutions Architect – Associate, Jun 2026, Credly link | LinkedIn (cert node) |

Possible extra repos in `~/work` (**ask the owner which are real, finished and public before using any**): `aratc_aws`,
`k8s_platform_bootstrap`, `serverless_url_shortner`, `cloud_study`, `mcp-jira-server`, `medwaste`, `itutor`, `hope_project`,
`bioot`, `sis`, `me_boutique`, `iassets`, `mo_api`, `netflix_multi_subtitles`. The Cloud world is thin, so cloud repos are valuable.
`~/work/latex_cv` and `~/work/mecodes_live` (current site) may hold extra facts. Skim, don't deep-read.

## Owner profile (facts for hero, about and CV)
Senior Mobile Engineer (Mobile & Platform), IntraZero, May 2024 – now, Cairo (hybrid). Freelance Software Engineer
(Node.js / Flutter) Jan 2022 – Dec 2024. Head of Flutter Committee, IEEE, Aug–Dec 2020. B.Sc. Computer Engineering,
Benha University, 2019–2024, grade Very Good. Certs: AWS SAA (Jun 2026 – Jun 2029); Complete Flutter & Dart (Udemy, Oct 2022).
Mentors junior Flutter developers. Targets: Senior Flutter / Mobile / Full-stack and Cloud / Platform roles, remote-first or Gulf,
and German-speaking markets (DE language).
