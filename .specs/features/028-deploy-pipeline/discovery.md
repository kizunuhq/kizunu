# 028 — Deploy pipeline discovery

> **Status:** discovery / mapping only. NOT a committed spec. **Blocked** on two
> infrastructure answers (see Open questions 1–2). Split out of feature
> `027-ci-validation-gate`, which owns the CI/test-gate half and is a hard
> prerequisite: deploy must never fire off a merge that wasn't test-gated.

## Goal

Get Kizunu code from a green `master` onto running environments: a staging
environment that updates on merge, and a production environment promoted
deliberately. Single region.

## Depends on 027

The auto-staging trigger here assumes `master` is already gated by the full
`bun check` (tests + the four `check-*` scripts) wired in 027. Build 027 first.

## References

- **`novuhq/novu`** — trunk-based (`next`), auto-staging on merge, manual prod.
  Good for the *shape*. Drop: multi-region fan-out, per-service label gating.
  Note: Novu's prod is **AWS ECR→ECS** (api/worker) + **Netlify** (web); its GHCR
  images are a **self-host download**, not what its cloud runs.
- **`~/Workspaces/spice-target`** — sibling, same stack. `publish.yml` (GHCR matrix
  build) and `release-please.yml` are near-drop-in. Its `publish.yml` only **builds
  and pushes images** — there is no rollout step in `.github`; the rollout lives
  elsewhere. We supply that half with Kamal.

## Branch model — DECIDED: trunk-only

`master` only. Every merge to `master` is the staging candidate; production is a
deliberate, manual promotion of an already-built image. Consequence: no `develop`
branch, no `pr-branch-policy.yml`, no `auto-backport-hotfix.yml`.

## Image / registry strategy — DECIDED

Drop environment-named tags. The tag carries *identity*; the *rollout trigger*
carries environment. One image stream per app (`api`, `web`) on GHCR:

- **Every push to `master`** → build → push **`:sha-<short>`** (immutable, or
  `:v<semver>` if release-please is on) **+ `:latest`** (moving pointer to `master`).
- **Staging auto-tracks `:latest`** — every merge lands there, no manual step.
- **Production is pinned to a chosen `:sha-<short>`** and never follows `:latest`.

No retag step: the bytes that ran on staging (by `sha-<short>`) are what prod pulls.

## Hosting / rollout — DECIDED: Kamal (internal)

Deploy with **Kamal** to internal servers over SSH (Kamal-proxy zero-downtime +
Let's Encrypt). Answers the "missing rollout half" directly:

- **Registry:** GHCR; Kamal `registry:` holds creds, `image:` →
  `ghcr.io/kizunuhq/kizunu/<app>`.
- **Build decoupled from deploy.** `publish.yml` builds + pushes once; Kamal deploys
  the prebuilt image via `kamal deploy --skip-push --version=<sha>` (no rebuild).
- **Destinations** = our two environments: `config/deploy.staging.yml` /
  `config/deploy.production.yml` (shared base `config/deploy.yml`), via
  `-d staging` / `-d production`. Build once, reuse the exact image for prod.
- **Migrations** run in a Kamal `pre-deploy` hook (or container entrypoint).
- **Rollback** is first-class: `kamal rollback <version> -d production`.

## Proposed adaptation (Model A shape)

```
feature/* ──PR──▶ master                 (027 CI gate required & green)
                    │  push to master
                    ▼
        publish.yml ⟶ GHCR :sha-<short> + :latest
                    │
                    ├──(auto)── kamal deploy -d staging --version=<sha> ──▶ STAGING
                    │
                    └──(manual) kamal deploy -d production --version=<sha> ──▶ PRODUCTION
                                 (GitHub Environment "production" approval gate)

        rollback: kamal rollback <version> -d production
        (optional) release-please ⟶ PR ⟶ tag v* ⟶ GHCR :v<semver>
```

Spec deliverables:
- `publish.yml`: matrix `[api, web]`; trigger `push: [master]` + `tags: v*`; tag
  `:sha-<short>` + `:latest`; build-args → Kizunu web env URLs.
- Staging rollout: a job after `publish.yml` runs `kamal deploy -d staging
  --skip-push --version=<sha>` over SSH.
- `promote-prod.yml`: manual `workflow_dispatch(sha)`, `production` GitHub
  Environment for the approval gate, runs `kamal deploy -d production --skip-push
  --version=<sha>`.
- `config/deploy.yml` + `config/deploy.{staging,production}.yml`.
- `release-please.yml`: optional + config/manifest.

## Open questions (1–2 are the blockers)

1. **Where Kamal runs + secrets.** Deploying from the runner needs an SSH key per
   host + GHCR read creds as GitHub Environment secrets (prod scoped to the
   `production` Environment behind the approval gate). Does CI run Kamal directly, or
   only a self-hosted/bastion runner with network access to the boxes? **Blocker.**
2. **Server topology.** Same host for staging + prod (separate Kamal destinations) or
   two hosts? Where does Postgres live — Kamal `accessory`, managed instance, or
   on-box? Drives `config/deploy.*.yml`. **Blocker.**
3. **Migrations via Kamal.** `pre-deploy` hook vs entrypoint; expand/contract for
   backward-incompatible changes; `kamal rollback` swaps the image but not the schema
   — document the discipline.
4. **Secrets per environment.** Meta WhatsApp + Pipedrive creds via Kamal env /
   `.kamal/secrets`, sourced from GitHub Environment secrets, scoped so staging
   cannot reach prod tenants.
5. **release-please on trunk-only?** Optional. If kept: single-package vs monorepo
   manifest; which paths.

## Suggested next step

Answer blockers 1–2, then capture the topology as an ADR via `create-adr` and run
`tlc-spec-driven`. Until then this stays discovery. 027 (CI gate) proceeds
independently and is the prerequisite.
