# v1.0 acceptance gate

> Feature `084` of Phase 2.1. Final verification checklist before tagging
> v1.0 and handing off to the pilot customer.

## Engineering acceptance

- [ ] `bun check` green on `master`.
- [ ] CI on `master` green for the v1.0 release commit (Required, Lint
      PR title, Quality, Unit, Integration, E2E all pass).
- [ ] Working branch clean: `git status` shows no uncommitted changes
      on the deploy machine.
- [ ] All Phase 2.1 features marked COMPLETE in `ROADMAP.md`.
- [ ] `STATE.md` Lessons entry for v1.0 release.

## Deployment acceptance

- [ ] Production HTTPS URL reachable from the public internet (verified
      via `curl -I https://kizunu.acme.com/health`).
- [ ] Pipedrive can POST to the CRM webhook URL (verify by triggering a
      test stage-change and watching the API logs).
- [ ] Meta can GET + POST the channel webhook URL (verify via Embedded
      Signup or by manually triggering Meta's webhook test from the App
      Dashboard).
- [ ] `APP_CREDENTIALS_ENCRYPTION_KEY` is set in production secrets
      manager and verified backed up separately from Postgres backups.
- [ ] Postgres `pg_dump` backup tested with a dry-run restore.

## Pilot acceptance — controlled live run

A controlled live pilot is the final gate. Run it through both BDRs in
the cohort:

- [ ] **Routing proof**: A Pipedrive deal owned by BDR-A enters the
      trigger stage → outbound message comes from BDR-A's WhatsApp
      number (not BDR-B's). Repeat with a deal owned by BDR-B (feature `062`).
- [ ] **Reply-stop proof**: BDR-A replies to the customer in WhatsApp →
      kizunu pauses the cadence (journey status flips to `replied`)
      and stops sending further touches (feature `010` + `031`).
- [ ] **Lost handling proof**: A second test journey runs to exhaustion
      → the deal is marked Lost in Pipedrive with the reason recorded
      (feature `009`).
- [ ] **Recovery proof**: Break the connector (rotate the API token in
      Pipedrive); verify the journey enters `error_state` with reason
      `no_channel` or equivalent (feature `071` / `072`); re-add the
      token and verify the journey resumes.

## Concerns gate

- [ ] All HIGH items in `.specs/codebase/CONCERNS.md` are either CLOSED
      or explicitly marked "accepted risk for v1.0" with operator
      sign-off.
- [ ] All MEDIUM items have a documented mitigation in place (e.g. the
      Pipedrive webhook HMAC is deferred but the token-per-row from
      feature `053` provides the equivalent verification surface).

## Customer handoff

- [ ] `docs/pilot-runbook.md` shared with the customer.
- [ ] `docs/pilot-deployment.md` (or the operator's internal copy)
      reviewed by the on-call team.
- [ ] Support escalation path agreed (Slack channel, email alias, on-call
      shift).
- [ ] Backup + restore procedure walked through with the customer's IT.

## Sign-off

Once every box above is checked, tag `v1.0` and announce the pilot
launch.
