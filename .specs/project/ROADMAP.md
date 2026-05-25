# Roadmap

**Current focus:** v1.0 pilot-plus customer fit (Phase 2.1).

Forward-looking only. Features collapse to `HISTORY.md` the moment they ship.
This file should never grow past two screens — if it does, sweep completed
work into HISTORY first.

---

## Now

_Nothing in flight. Add the next PLANNED / IN PROGRESS feature here when work
starts (one block per feature: title + status + a few bullet points of scope)._

## Next

_Queued for after Now clears. Source: open CONCERNS items, the active pilot's
feedback, deferred slices listed under Later._

## Later

Known deferred work, ordered roughly by likelihood we pick it up next.

- **Coex phone-number picker** — needs a pre-row preview endpoint
  (`POST /channel-accounts/meta-whatsapp/preview-phone-numbers`) because the
  channel-account row is only persisted after Coex Finish. Tracked in
  `.specs/codebase/CONCERNS.md`.
- **Pipedrive custom-field UI swap** — endpoint + hook
  (`useDirectoryPipedriveFields`) already ship; the picker lands when a
  variable-resolver UI exists to consume them.
- **Multi-Meta-account template scoping** — `template-form.tsx` currently picks
  the first Meta channel account; add an account picker when a multi-account
  workspace materializes.
- **Pipedrive webhook HMAC verification** — keep the UUIDv7-as-shared-secret
  model for the first pilot; add HMAC when onboarding the second customer or
  when an audit demands it (CONCERNS Medium).
- **Native WhatsApp inbox / conversations** — the Minimum-UI inbox slice
  deferred from v0.1; needs an inbound-message store.
- **Deploy pipeline via Kamal** (feature `028` discovery in
  `.specs/features/028-deploy-pipeline/`). Trunk-only, every `master` push
  builds one GHCR image per app (`:sha-<short>` + `:latest`); staging
  auto-tracks `:latest`, production is a manual pinned promotion. Blocked on:
  where Kamal runs in CI + secrets, and server topology.
- **Second channel plugin** (email SMTP or Telegram).
- **Second CRM connector** (HubSpot or RD Station).
- **First community-contributed plugin.**

---

## Past

Past phases collapse to one line. Full feature blurbs in
[`HISTORY.md`](HISTORY.md).

- **v0.1 — Pilot end-to-end** — COMPLETE. Features `002`–`020`.
- **Phase 1.5 — Differentiation** — COMPLETE. Feature `021`.
- **Phase 1.6 — Auth & identity enrichment** — COMPLETE. Features `022`–`026`, `040`.
- **Phase 1.7 — Delivery & infra** — CI gate `027` COMPLETE; deploy pipeline
  `028` deferred (see Later).
- **Phase 1.8 — WhatsApp Coexistence onboarding** — COMPLETE. Features `029`–`031`, `058`.
- **Phase 1.9 — Web frontend polish & doctrine** — COMPLETE. Features `032`–`039`, `041`–`046`.
- **Phase 2.0 — Pilot delivery hardening** — COMPLETE. Features `047`–`049`, `053`–`057`.
- **Phase 2.1 — v1.0 pilot-plus customer fit** — COMPLETE through `085`.

---

## Future Considerations

- Native CRM (deals, own pipeline, contacts).
- Top of funnel: forms, landing pages, enrichment, scoring.
- Intelligence (AI): reply classification, touch generation, BDR coaching.
- Paid cloud: managed hosting, multi-tenant, SSO, audit log, advanced RBAC,
  premium connectors.
- Automatic lead reassignment; round-robin / load balancing across channels.
