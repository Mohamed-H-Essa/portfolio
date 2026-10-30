# Growth plan: what to build next (written 2026-10-30)

The site now shows 15 projects. This is what I'd add next to make it land with **cloud / platform** hiring managers,
without losing the mobile story. Each finished piece becomes a new node on the map with its own live idea on its page,
like the demos already on Misr El Kheir, German Sync, HOPE, AWS SAA and Mobile security.

## Where you stand
**Strong already:**
- About ten shipped mobile apps (Flutter and React Native) for government, NGO and consumer clients, in Arabic and English.
- A release pipeline and mobile security work.
- A full serverless system (HOPE), a re-platforming from AWS to Cloudflare with conflict-free sync (German Sync), and the AWS
  Solutions Architect – Associate certification.

**What a platform recruiter will look for and not find yet:**
1. **Kubernetes running something real.** `~/work/k8s_platform_bootstrap` describes EKS + ArgoCD + Prometheus + cert-manager,
   but it has 2 commits and isn't finished.
2. **Infrastructure as code you can show end to end, in public.** HOPE uses shell scripts, and German Sync's Terraform was
   retired.
3. **Observability and reliability work:** dashboards, service level objectives (SLOs), alerts, an incident write-up.
4. **Numbers.** No project on the site has a metric yet. One true number per project changes how the whole site reads.
5. **Public code.** Few nodes link to a repository a reviewer can open.

## The flagship: finish `k8s_platform_bootstrap` into a public, measured platform
Working name: **Shipyard**.
- **Why this project:** it covers everything a platform interview asks about (IaC, Kubernetes, GitOps, CI/CD security,
  observability, cost, incidents), and it starts from a repo you already began.
- **Why it fits you:** it joins your two worlds. The workload is a real backend, and a Flutter client ships through your
  existing release pipeline.

1. **Foundation (IaC):** Terraform for the VPC, EKS (spot nodes, and a nightly scale-down to keep the bill small), remote state,
   and GitHub Actions → AWS through OIDC (no long-lived keys). One `make up` / `make down`, like your HOPE teardown, but in
   Terraform.
2. **A real workload:** containerise the URL shortener (quick win A), or another small API you write, plus a database.
   ArgoCD runs it in app-of-apps style: every change is a pull request.
3. **Observability:** kube-prometheus-stack, Loki and Tempo, with OpenTelemetry in the service. Define **two SLOs**
   (availability 99.5 %, p95 latency < 300 ms) with burn-rate alerts.
4. **Supply chain:** scan images with Trivy, generate an SBOM with Syft, sign with cosign, and have a Kyverno policy that
   refuses unsigned images.
5. **Cost:** Infracost comments on every pull request, AWS Budgets alerts, and a monthly cost line in the README.
6. **Chaos day:** kill nodes, cut the database, roll back a bad deploy. Measure the time to recover and **publish a short
   postmortem.**

**On the site:**
- A Cloud-layer node with the running architecture (the HOPE-style flow).
- A status panel fed by a nightly JSON export from Prometheus (SLO, error budget left, cost this month).
- The postmortem as the project's story.
- Real numbers as the impact line: deploy time, time to recover, monthly cost.

## Two quick wins (a weekend or two each)
**A. Finish the serverless URL shortener and make it live.**
- It's already CDK + Lambda + DynamoDB.
- Add a custom domain behind CloudFront, a WAF rate limit, X-Ray tracing, tests in CI, and a k6 load test.
- Publish **p95 latency and cost per million requests**.
- A working link on the site beats any screenshot.

**B. Mobile observability.**
- Put OpenTelemetry into one Flutter app (or a small demo app) and send it through a collector to Grafana.
- Track cold start, slow frames, and API latency per screen.
- Few people can show phone-to-backend telemetry in one dashboard. It's your "apps and what they run on" line, proven.
- On the site it becomes a Platform-layer node.

## Certifications, in this order
1. **HashiCorp Terraform Associate:** a few weeks of study alongside Shipyard's foundation phase.
2. **CKA (Certified Kubernetes Administrator):** after Shipyard's observability phase, when the hands-on is already done.
3. **AWS DevOps Engineer – Professional:** later; it builds on the Solutions Architect certificate you already hold.

Each one becomes a credential node, with the same panel the AWS SAA page has now.

## Make what's already there count more (no new code)
- **Answer the questions in `docs/owner-todo.md`:** store links (Motary, iTutor, Leem), roles and dates. A wrong or
  missing fact costs more credibility than a missing project.
- **One number on three projects:**
  - the release pipeline: release time before and after;
  - security: MobSF findings fixed;
  - Qanoni or EHC: downloads or crash-free rate.
- **Make repositories public where you can** (the K8s bootstrap, the URL shortener, the German Sync worker) and link them from
  their nodes.
- **Recapture a few screens:**
  - Heaven Flowers at full resolution;
  - Yafleet with real parcel photos;
  - Leem with real abstracts instead of the demo text.
- **One short LinkedIn post per new project, linking to its page.** A shared link now starts a new visitor at the ∞ intro,
  so every post is an entrance to the whole site.
- **German copy:** have a native speaker read the DE texts once. Every content file is still marked `review: de`.

## Twelve weeks, evenings and weekends
| Weeks | Build | Learn | On the site |
|---|---|---|---|
| 1–2 | URL shortener finished, live, load-tested | start Terraform Associate | new node + live link |
| 3–6 | Shipyard: Terraform, EKS, ArgoCD, the workload, observability, SLOs | Terraform Associate | |
| 7 | | **Terraform Associate exam** | credential node |
| 8–9 | Shipyard: supply-chain security, cost report | start CKA | |
| 10 | Chaos day + postmortem | | Shipyard node: architecture, status panel, story, numbers |
| 11–12 | Mobile observability | CKA | Platform node |

Send me each piece as it's finished (repo, a few facts, any numbers) and I'll add it to the map with its own live idea.
