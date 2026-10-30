# Slipway: PR kit

Everything needed to announce Slipway (repo `Mohamed-H-Essa/k8s_platform_bootstrap`) on LinkedIn, X and a blog,
in the owner's voice. Written 2026-10-30 from the repo's README, `docs/` (architecture, SLOs, ADRs, AWS, chaos day,
postmortem, interview guide) and the chaos-day evidence in `.local/chaos/`.

**Rules for this file**
- Every claim here is in the repo or its evidence. If you add one, add it there first.
- `{{NUMBER: …}}` = a measurement that isn't final yet. Don't post anything that still has one; the list is at the end.
- No hype words ("leveraged", "robust", "seamless", "game-changer", "excited to announce"). Say what it does and what
  was measured.
- Don't post before: the repo is pushed with the new code, CI is green on GitHub, and the numbers are filled in.

Links used below:
- Repo: https://github.com/Mohamed-H-Essa/k8s_platform_bootstrap
- Postmortem: https://github.com/Mohamed-H-Essa/k8s_platform_bootstrap/blob/main/docs/postmortems/2026-10-30-chaos-day.md
- Project page: https://mohamed-h-essa.github.io/portfolio/en/all/p/slipway/

---

## 0. Fact sheet (what you can say, and what you can't)

**Say**
- `make up` builds everything: Terraform creates a 3-node kind cluster (1 control plane, 2 workers), a private OCI
  registry, pull-through image caches, a Git server (soft-serve) and Argo CD with one root Application.
- Argo CD installs the rest from Git: 13 Applications in three sync waves (operators and CRDs → what builds on them →
  the workload). Envoy Gateway (Gateway API), Kyverno, kube-prometheus-stack, Loki + Alloy, Tempo + OpenTelemetry
  Collector, CloudNativePG, metrics-server.
- The workload is a Go URL shortener (distroless, non-root, 34.2 MB image, 43 packages in its SBOM) with Postgres
  (primary + streaming replica, automatic failover).
- Release gate: Trivy fails on fixable HIGH/CRITICAL; Syft writes an SPDX SBOM; cosign signs the image and attests the
  SBOM; Kyverno admits only signed + attested images in app namespaces and pins the tag to the verified digest.
  `make unsigned` shows the refusal. Trivy blocked the very first image (a HIGH CVE in `golang.org/x/net`).
- SLOs: availability 99.5 % and latency 95 % < 300 ms over 30 days; page at 14.4× burn over 1 h and 5 m, ticket at
  6× over 6 h and 30 m (Google SRE Workbook, ch. 5). Exemplars open the trace in Tempo.
- Chaos day under k6 at 50 req/s, measured by scripts. Run 1: release live 35 s after publish, 0 of 2,299 requests
  failed (an earlier release: 48 s, 0 of 2,910); pod kill: 4/4 ready in 12 s, 0 of 1,111 failed; **node loss: 8,778
  of 18,140 requests failed (48.4 %) for 6 min 3 s**, the app's SLI saw none of it. Causes: the gateway controller's
  single replica and Kyverno's fail-closed webhook on the lost node (5-minute default eviction; the webhook blocked
  the eviction deletes). Fixed the same day.
- CI (GitHub Actions): Go vet + race tests, image build → Trivy → Syft, Terraform fmt/validate + tflint + trivy config,
  kubeconform over every rendered manifest, actionlint; on `main` it pushes to GHCR and signs keyless with cosign
  (GitHub OIDC, no stored keys). A weekly e2e job runs `make up` on a GitHub runner.
- AWS environment in Terraform: EKS 1.35, 3-AZ VPC with one NAT, spot `apps` group + on-demand `system` group, night
  scale-down, Pod Identity for the EBS CSI driver, a GitHub OIDC role, AWS Budgets, S3 state + DynamoDB lock.
  `terraform validate` valid, tflint 0 issues, `trivy config` 0 HIGH/CRITICAL.

**Don't say**
- That it ran on AWS, or anything about AWS cost or speed: the AWS environment has **never been applied** (no account).
- "Production-grade" or "production": it's *production-style*, on one laptop. The numbers show behaviour, not capacity.
- Star counts, users, or "used by teams". (The old CV claimed "120+ stars" and "EKS in under 12 minutes" for this repo;
  neither was true. The CV now describes Slipway.)
- That CI is green, until it has run on GitHub after the push.
- The run-2 results before they're in (`{{NUMBER}}`s).

---

## 1. LinkedIn launch post

```text
I built a Kubernetes platform that runs on a laptop, and then I spent a day breaking it.

It's called Slipway. One command (make up): Terraform creates a three-node kind cluster, a private registry, image caches and a Git server. Argo CD then installs everything else from Git, in three sync waves: Envoy Gateway on the Gateway API, Kyverno, Prometheus, Grafana, Loki, Tempo with OpenTelemetry, and CloudNativePG for Postgres with a replica and automatic failover.

On top runs a small Go URL shortener with two SLOs (99.5 % availability, 95 % of requests under 300 ms) and multi-window burn-rate alerts.

Every release goes through a gate: a Trivy scan, an SBOM from Syft, a cosign signature. Kyverno refuses any image that isn't signed and attested. Two releases at 50 requests a second: 0 failed requests.

Then the chaos day, with k6 sending traffic the whole time: a pod kill, a node loss, a database failover, and a bad release shipped through Git and rolled back with git revert.

The node loss failed 48 % of requests for six minutes, and the app's own SLO saw none of it. The cause was in the platform, not the app. I wrote it up as a blameless postmortem and fixed it the same day.

There's also an AWS version (EKS on spot nodes, GitHub OIDC for CI, Budgets) written in Terraform and checked offline. I haven't applied it: I don't have an AWS account, and the README says so.

Repo, docs and the postmortem: https://github.com/Mohamed-H-Essa/k8s_platform_bootstrap

I'm a mobile engineer moving into platform and DevOps work. If you run platforms for a living, I'd like to hear what you would change.

#Kubernetes #PlatformEngineering #DevOps #SRE #GitOps
```

Attach: the carousel PDF (§6) *or* a 60–90 s screen recording of `make up` → Argo CD going green → `make release` (§7).
First comment: the project page link. (Some people move every link to the comments for reach; keep the repo link in
the body anyway, it's the point of the post.)

---

## 2. Technical deep-dive post: how a release gets in

```text
How one release gets into my laptop platform (Slipway), step by step:

1. make release builds the Go service into a distroless image that runs as non-root: 34.2 MB, tagged with the commit and the time.
2. Trivy scans it and stops the release on any fixable HIGH or CRITICAL vulnerability. It stopped the very first image (a HIGH CVE in golang.org/x/net) until I bumped the module.
3. Syft writes an SPDX bill of materials: 43 packages.
4. cosign signs the image and attaches the SBOM as a signed attestation. It runs in a container on the cluster's Docker network, so the signature names the image exactly as the cluster pulls it.
5. The new tag is committed and pushed to a Git server next to the cluster. Git is the only way in.
6. Argo CD syncs the change.
7. Kyverno checks the signature and the SBOM attestation against the release key and rewrites the tag to the verified digest, so the pod runs the exact bytes that were signed. No signature, no pod.
8. A rolling update with maxUnavailable: 0. Pods go unready, wait 5 s for the endpoints to update, then drain for up to 20 s.

Under 50 requests a second: live 35–48 s after publish, 0 failed requests in two runs. Rolling back is git revert.

On a laptop the release key lives in a gitignored folder. In GitHub Actions the same image is signed keyless with the workflow's OIDC identity, so CI stores no keys, and on AWS Kyverno checks for that identity instead.

Two things that broke on the way:
- The Grafana chart generated a new admin password on every render, so Argo CD showed it out of sync forever. The Secret now comes from make up, outside Git.
- Kyverno rewrites every image to tag@digest. Argo CD drops mutating-webhook changes from its diff by default, so a new release compared as "Synced" and never rolled out. includeMutation on that one Application fixed it.

Code and the decision records: https://github.com/Mohamed-H-Essa/k8s_platform_bootstrap

#SupplyChainSecurity #Kubernetes #GitOps #ArgoCD #Sigstore
```

(The `includeMutation` story is from the chaos-day run 2 fix in `platform/apps/templates/applications.yaml`; check the
run-2 postmortem keeps it before posting.)

---

## 3. Chaos-day / postmortem post

```text
I stopped one worker node of my Kubernetes platform while k6 sent it 50 requests a second.

48.4 % of requests failed for 6 minutes 3 seconds (8,778 of 18,140). My availability SLO recorded zero errors.

Both are true. The SLI is measured at the app, and none of the failures reached the app:
- Envoy Gateway's only controller replica was on the stopped node. Pods without explicit tolerations stay bound to a dead node for 5 minutes by default, so Envoy kept sending half the traffic to two dead pods.
- Kyverno's only admission controller was on that node too. Its webhook is fail-closed and also matched DELETE, so the API server refused the eviction of the app's pods. They were never replaced.

Fixed the same day:
- Envoy routes around dead pods by itself: a 1 s connect timeout, retries on connect failure, passive outlier detection.
- Two replicas for the gateway controller and Kyverno, PDBs, 30 s eviction tolerations.
- Kyverno policies match CREATE and UPDATE only, never DELETE.
- The availability rule returns 0 % instead of "no data" when there are no errors.

Run 2, after the fixes: {{NUMBER: node loss after the fixes, run 2}}.
The rest of the day: a database failover ({{NUMBER: db failover, time to a new primary}}, {{NUMBER: db failover, failed requests}}) and a bad release shipped through Git (paged after {{NUMBER: bad release, time to page}}, clean {{NUMBER: bad release, revert to clean traffic}} after git revert).

What I took from it:
1. A fail-closed admission webhook is part of the availability path for everything it matches, deletes included.
2. An SLI measured inside the service can't see failures in front of it. Measure where the user is, too.
3. The graceful paths were fine. The ungraceful one found the platform's own single points of failure.

Full postmortem, with the timeline: https://github.com/Mohamed-H-Essa/k8s_platform_bootstrap/blob/main/docs/postmortems/2026-10-30-chaos-day.md

#SRE #ChaosEngineering #Kubernetes #Observability #Postmortem
```

Image: carousel slide 6 (the run-1 strip) or a Grafana screenshot from the recording (§7).

---

## 4. X / Twitter thread

```text
1/ I built a production-style Kubernetes platform that runs on a laptop, then broke it on purpose under load. It's called Slipway, it's open source, and the postmortem is in the repo. 🧵

2/ make up: Terraform creates a 3-node kind cluster, a registry, image caches and a Git server. Argo CD installs the rest from Git: 13 Applications in 3 sync waves. Nothing is installed by hand.

3/ The platform: Envoy Gateway (Gateway API), Kyverno, Prometheus, Grafana, Loki, Tempo + OpenTelemetry, CloudNativePG. The workload: a Go URL shortener with 2 SLOs and multi-window burn-rate alerts.

4/ Every release: Trivy scan → Syft SBOM → cosign signature → commit → Argo CD → Kyverno checks signature + SBOM and pins the digest. An unsigned image never gets a pod.

5/ Two releases at 50 req/s: 0 failed requests, live 35–48 s after publish. Rollback is git revert.

6/ Chaos day, k6 the whole time: pod kill → 4/4 ready in 12 s, 0 failed. Node loss → 48.4 % of requests failed for 6 min. The app's SLO saw zero.

7/ Why: the gateway's only controller and Kyverno's only webhook were on the dead node. The webhook (fail-closed) even blocked the pod evictions. Fixed the same day: retries + outlier detection, 2 replicas, 30 s tolerations, no webhook on DELETE.

8/ After the fixes: {{NUMBER: node loss after the fixes, run 2}}. DB failover: {{NUMBER: db failover, time to a new primary}}. A bad release paged after {{NUMBER: bad release, time to page}}.

9/ The AWS version (EKS, spot, OIDC, Budgets) is written in Terraform and passes validate, tflint and trivy config. Never applied: no account, and the README says so.

10/ Repo: https://github.com/Mohamed-H-Essa/k8s_platform_bootstrap
Postmortem: docs/postmortems/2026-10-30-chaos-day.md
Feedback from people who run platforms is very welcome.
```

---

## 5. dev.to / Medium article outline

**Title options**
- "I broke my laptop Kubernetes platform on purpose. Here's what the postmortem found."
- "A GitOps platform on a laptop: signed images, SLOs and a chaos day"

**Outline** (~2,000 words, 6–8 code blocks, 3 images)
1. **Why** (150 words). Platform skills are hard to show without a cloud bill; the goal was something anyone can run
   with Docker and 8 GB, and evidence of how it fails. Say up front: one laptop, numbers show behaviour, not capacity.
2. **The shape** (300). README Mermaid diagram. Terraform stops at Argo CD + one root app; `platform/apps` is a Helm
   chart (app of apps) with sync waves and an Application health check so waves really wait. The Git server next to
   the cluster, so `git revert` works offline (ADR `git-server-next-to-the-cluster`).
3. **A release, end to end** (400). `make release` output (real, from `.local/chaos/20261030-115711/release.log`);
   Kyverno `verifyImages` excerpt from `platform/policies/local`; why cosign v2 runs on the kind network; key locally
   vs keyless in CI (ADR `ci-keyless-signing`). `make unsigned` output.
4. **SLOs that mean something** (350). The two SLIs (PromQL from `docs/slo.md`), the burn-rate math (1 h ratio must
   pass 7.2 % for availability), the page/ticket table, and why the long + short window pair. Exemplar → trace → logs.
5. **Chaos day** (500). The method: hypothesis first, k6 at 50 req/s, scripts measure (`results.tsv`, per-request
   log). The table of five experiments with results. The node-loss story with the strip image and the two root
   causes; the fixes as code (`BackendTrafficPolicy`, tolerations, Kyverno operations). Run 2 results:
   {{NUMBER: node loss after the fixes, run 2}}, {{NUMBER: db failover, time to a new primary}},
   {{NUMBER: bad release, time to page}}.
6. **The AWS version, honestly** (200). What's in `envs/aws`, what `make aws-check` checks, what's not done (DNS/TLS,
   S3 for Loki/Tempo, autoscaling), and that it was never applied.
7. **What I'd change for production** (150). From the interview guide: 3 Postgres instances with synchronous
   replication + PITR backups, SLI at the gateway, TLS + SSO, network policies, multi-cluster with ApplicationSets,
   Renovate, remote storage for telemetry.
8. **Close** (50). Repo link, "run it, break it, tell me what you'd do differently".

Canonical URL: publish on dev.to first, cross-post to Medium with the canonical link set to dev.to.
Tags (dev.to allows 4): `kubernetes`, `devops`, `sre`, `gitops`.

---

## 6. Carousel (LinkedIn document post, 8 slides)

Rendered from `docs/pr/slipway-carousel/deck.html` (site palette, Space Grotesk + JetBrains Mono):
`slide-01.png` … `slide-08.png` (1080×1350) and `slipway-carousel.pdf` (upload this one to LinkedIn). Re-render after
filling the numbers: `node docs/pr/slipway-carousel/render.mjs` (it also writes `social-preview.png`, §9).

| # | Headline | Body |
|---|---|---|
| 1 | I built a production-style Kubernetes platform that runs on a laptop. | Then I broke it on purpose, under load, and measured how it recovered. `make up` · `make release` · `make chaos` |
| 2 | One command. Terraform builds the ground, Git builds the rest. | Terraform: 3-node kind cluster, registry, image caches, Git server, Argo CD. Wave 0: Envoy Gateway, Kyverno, Prometheus, CloudNativePG, metrics. Wave 1: Loki, Tempo, OpenTelemetry, routes, policies, SLO rules. Wave 2: the Go shortener and its Postgres. 13 Argo CD Applications in three sync waves. Nothing is installed by hand. |
| 3 | Every release goes through a gate. | Build → Scan (Trivy) → SBOM (Syft) → Sign (cosign) → Commit → Sync (Argo CD) → **Admit (Kyverno)** → Roll out. **0** failed requests in two releases at 50 requests a second. `make unsigned` → refused by Kyverno, as it should be. |
| 4 | Alerts that page on what users feel, not on CPU. | 99.5 % of requests without a 5xx; 95 % within 300 ms. Page when the 1 h and 5 m burn rates pass 14.4×; ticket at 6× over 6 h and 30 m; exemplars open the trace in Tempo. |
| 5 | Then I broke it. k6 at 50 req/s the whole time. | Release: held (live 35 s after publish, 0 of 2,299 failed). Pod kill: held (4/4 ready in 12 s, 0 of 1,111 failed). Node loss: broke (48.4 % failed for 6 min 3 s). DB failover: {{NUMBER: db failover, time to a new primary}} · {{NUMBER: db failover, failed requests}}. Bad release: paged after {{NUMBER: bad release, time to page}}, clean after {{NUMBER: bad release, revert to clean traffic}}. |
| 6 | The app's own SLO saw zero errors. Clients saw 48 %. | The run-1 strip (10 s bars). The gateway's only controller was on the lost node; Kyverno's fail-closed webhook was there too and blocked the evictions; fixed the same day. After the fixes: {{NUMBER: node loss after the fixes, run 2}}. |
| 7 | The AWS version is written. I haven't applied it, and the README says so. | EKS 1.35 with spot workers and night scale-down; 3-AZ VPC, one NAT; Pod Identity, GitHub OIDC; Budgets, S3 state. `terraform validate` valid · tflint 0 issues · trivy config 0 HIGH/CRITICAL. |
| 8 | Run it yourself: Docker with 8 GB and one command. | Repo, postmortem, portfolio. "I'm a mobile engineer moving into platform and DevOps work. Questions and reviews welcome." |

Post text for the carousel:

```text
Slipway in 8 slides: a GitOps platform on a laptop, the gate every release goes through, and what a chaos day found.
The repo has the code, the decision records and the postmortem: https://github.com/Mohamed-H-Essa/k8s_platform_bootstrap
#Kubernetes #PlatformEngineering #SRE
```

---

## 7. What to screen-record

Record on the laptop with the platform up (`make up && make smoke`), 1920×1080, terminal font ≥ 16 pt, dark themes,
notifications off. Never show the Argo CD admin password (`make urls` prints it) or `.local/`.

| Clip | Length | Screen | Use |
|---|---|---|---|
| A. `make up` from nothing | 60–90 s (time-lapse, 8–10×) | terminal left; right: `kubectl -n argocd get applications -w` or the `wait-healthy.sh` table turning green wave by wave | launch post, article |
| B. `make release` under load | 60 s | terminal running `make release`; Argo CD UI on the shortener app (sync → rolling update); Grafana "Shortener · service and SLOs" request rate staying flat, error panel at 0 | deep-dive post |
| C. `make unsigned` | 15 s | terminal only: the refusal and "refused by Kyverno (verify-platform-images), as it should be" | X thread, carousel GIF |
| D. Exemplar → trace → logs | 30 s | Grafana latency panel → click an exemplar → Tempo trace → "logs for this span" in Loki | article |
| E. Chaos day: node loss | 2–3 min (cut) | split: `scripts/chaos/run-all.sh node-loss` timeline; `kubectl get pods -A -o wide -w`; Grafana request rate + k6 errors; the node going NotReady and pods moving after 30 s | chaos post |
| F. Chaos day: bad release | 2 min (cut, keep real clock) | Grafana burn-rate panel crossing the 14.4× line; Alertmanager showing `ShortenerErrorBudgetFastBurn` firing; `git revert` + publish; the alert resolving | chaos post, article |

Also export, as still images: the Grafana SLO dashboard during the bad release, the Argo CD app tree (all green), and
the postmortem's timeline table.

---

## 8. Hashtags

Use 3–5 per LinkedIn post, 1–2 on X.

- Core: `#Kubernetes` `#PlatformEngineering` `#DevOps` `#SRE` `#GitOps`
- Per topic: `#ArgoCD` `#Terraform` `#SupplyChainSecurity` `#Sigstore` `#Kyverno` `#Observability` `#OpenTelemetry`
  `#ChaosEngineering` `#CloudNative` `#Postmortem`
- Skip: `#AWS` on its own (nothing ran on AWS), `#100DaysOfCode`, generic `#Tech` / `#Innovation`.

---

## 9. Two-week schedule

Day 0 is the first weekday after: the repo is pushed, CI is green, the numbers below are filled in, the portfolio is
deployed. Post Tue–Thu mornings when possible (08:30–10:00 CET reaches Germany and Cairo; Gulf is +1–2 h).

| Day | Where | What |
|---|---|---|
| 0 | GitHub | Polish the repo (§10), pin it, publish release `v1.0.0` with short notes |
| 1 (Tue) | LinkedIn | Launch post (§1) + clip A or the carousel cover |
| 1 | X | Thread (§4) with clip C |
| 2 (Wed) | LinkedIn | Reply to every comment from day 1; add Slipway to profile **Featured** (repo + project page) and to the "Projects" section |
| 3 (Thu) | LinkedIn | Carousel (§6) as a document post |
| 4–5 | — | Write the article (§5) from the outline |
| 6 (Mon) | LinkedIn | Experience/About: one line on Slipway (factual, see §0) |
| 7 (Tue) | LinkedIn | Chaos-day post (§3) + slide 6 or a Grafana still |
| 8 (Wed) | dev.to | Publish the article; cross-post to Medium with canonical URL |
| 9 (Thu) | LinkedIn | Deep-dive post (§2) linking the article in the first comment |
| 10 (Fri) | X | Clip E or F with one line ("the app's SLO saw zero errors; clients saw 48 %") |
| 11–13 | Communities | Optional: share the article where self-posts are welcome (r/kubernetes weekly threads, the CNCF Slack channels for kind and Argo CD). One post per place, no cross-spamming |
| 14 | — | Look back: which post brought profile views / recruiter messages; reuse that angle |

---

## 10. GitHub repo polish checklist

- [ ] **Description** (About): `Slipway: a production-style GitOps platform on a laptop. Terraform + kind, Argo CD,
      Envoy Gateway, Kyverno + cosign, Prometheus/Loki/Tempo, CloudNativePG, SLOs and a chaos day.`
- [ ] **Website**: https://mohamed-h-essa.github.io/portfolio/en/all/p/slipway/
- [ ] **Topics** (20 max): `kubernetes` `gitops` `argocd` `terraform` `kind` `platform-engineering` `sre` `slo`
      `kyverno` `cosign` `sigstore` `sbom` `trivy` `gateway-api` `envoy-gateway` `prometheus` `opentelemetry`
      `cloudnative-pg` `chaos-engineering` `golang`
- [ ] **Social preview** (Settings → General): upload `docs/pr/slipway-carousel/social-preview.png` (1280×640)
- [ ] **Pin** it first on the profile; mention it in the profile README
- [ ] **README**: the `NUMBERS` table filled (§11); the CI badge only once it's green; a GIF of clip A or C under the
      first paragraph; keep the "never applied" line for AWS
- [ ] **Release** `v1.0.0`: notes = what it is, the commands, the measured numbers, link to the postmortem
- [ ] **Packages**: after the first `main` run, check `ghcr.io/mohamed-h-essa/shortener` is public and signed
      (`cosign verify` with the keyless identity from `docs/adr/ci-keyless-signing.md`)
- [ ] **Secrets check** before the push (`gitleaks` in Docker, `.local/` ignored)
- [ ] **Name**: keep `k8s_platform_bootstrap` for now (the CV and the site link to it). Renaming to `slipway` is fine
      later: GitHub redirects old URLs, but update both links anyway
- [ ] Issues on, Discussions optional; a "Known limitations" section (one laptop, local volumes, numbers not a benchmark)
      is already in the interview guide: link it from the README

---

## 11. Open numbers

Measurements that are not final yet. They appear exactly as written below; replace them everywhere (`grep -rn
'{{NUMBER' src docs`), re-render the carousel, rebuild the site.

| Placeholder | What it is | Where it's used | Source |
|---|---|---|---|
| `{{NUMBER: node loss after the fixes, run 2}}` | node loss re-run after the fixes: failed requests / how long / time until pods Ready elsewhere | `src/content/projects/slipway.yaml` (result en/de/ar), `src/components/demo/slipway-data.ts` (`N.nodeLossRun2`), carousel slide 6, §3, §4 | run 2 `results.tsv` / postmortem `RUN2_TIMELINE` |
| `{{NUMBER: db failover, time to a new primary}}` | CloudNativePG promotes the replica after … | `slipway-data.ts` (`N.dbNewPrimary`), slide 5, §3, §4, §5 | run 2 |
| `{{NUMBER: db failover, failed requests}}` | client-side failed requests during the failover | `slipway-data.ts` (`N.dbFailed`), slide 5, §3 | run 2 |
| `{{NUMBER: bad release, time to page}}` | from publishing `FAULT_ERROR_RATE=0.5` to `ShortenerErrorBudgetFastBurn` firing | `slipway-data.ts` (`N.pageAfter`), slide 5, §3, §4, §5; interview guide `{{PAGE_TIME}}` | run 2 |
| `{{NUMBER: bad release, revert to clean traffic}}` | from `git revert` + publish to clean traffic | `slipway-data.ts` (`N.recoverAfter`), slide 5, §3 | run 2 |
| `{{NUMBER: make up, cold cache}}` | `make up` from nothing, empty image caches | README `NUMBERS`, interview guide `{{UP_COLD}}` (not used in posts yet) | to measure |
| `{{NUMBER: make up, warm cache}}` | `make up` with warm caches | README `NUMBERS`, `{{UP_WARM}}` | to measure |
| `{{NUMBER: k6 baseline, p95 latency}}` | `make load`, 2 min at 50 req/s (measured earlier: 168.5 ms, host load ~20) | README `NUMBERS` | to confirm |
| `{{NUMBER: k6 baseline, p99 latency}}` | same run (measured earlier: 411 ms) | README `NUMBERS` | to confirm |

When run 2 is in, also set `VERDICT` in `slipway-data.ts` (`db-failover`, `bad-release`: `held` or `broke`), and if
run 2 is the better evidence, add its strip next to run 1's (same binning: 10 s, share failed).

**Facts to re-check with run 2** (final today, but run 2 could change them)
- "0 failed requests in two releases under load" (site metric, CV, slide 3, posts). Run 2 also ships a release.
- "live 35–48 s after publish" (the two run-1-era releases).
- The `includeMutation` story in §2 (from run 2's fix; keep only if the postmortem keeps it).
