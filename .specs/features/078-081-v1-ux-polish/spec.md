# v1 UX polish (078 + 079 + 080 + 081) — Specification

## Problem Statement

Phase 2.1 ships the operational features the pilot needs. The remaining
roadmap entries (dashboard polish, connector/channel form polish, cadence
and journey table polish, provider setup + webhook UX) are surface-level
improvements that share enough plumbing to ship as one focused PR rather
than four tiny ones.

## Goals

- [ ] **078 Dashboard v1 control-panel polish** — the workspace overview
      surfaces "Queued / Just happened / Why dropped" using existing
      lead-journey signals.
- [ ] **079 Connector / channel form UX polish** — already largely
      delivered in `059`/`054`/`056`/`057`/`061` (token-first form,
      labeled provider pickers, health pills); this slice adds the last
      gap: connector + channel rows show the **webhook URL** with a
      copy-button.
- [ ] **080 Cadence and journey table UX polish** — timestamps render
      relative ("in 2h", "3m ago"); table density tightened on the
      journey rows; filter chips gain an "Inactive" group.
- [ ] **081 Provider setup + webhook UX** — already mostly satisfied by
      060/061 (health pills) + 079 (webhook URL copy). This slice
      consolidates the remaining gap: a small "Webhook" section on the
      connector + channel rows with the URL + token-rotated info.

## Out of Scope

- Major dashboard rewrites (Phase 2.2 territory).
- New endpoints (everything reuses existing data).

## Acceptance Criteria

1. WHEN visiting `/workspace` THEN the page SHALL show three small
   cards: Queued (count of `running` journeys with `nextTouchAt` in the
   next hour), Just happened (count of touches in the last hour — uses
   `touchAttempts` count via the existing list endpoint or skips with a
   placeholder), Why dropped (count of `error_state` journeys with the
   most common errorReason as the subtitle).
2. WHEN visiting `/settings/connectors` THEN each connector row SHALL
   display a copy-button for the public webhook URL (already stored on
   the row since feature `053`).
3. WHEN visiting `/settings/channels` THEN each Meta channel row SHALL
   display a copy-button for the inbound webhook URL.
4. WHEN visiting `/workspace/journeys` THEN the Next-touch column SHALL
   render a relative timestamp ("in 2h 15m") instead of the ISO string.

## Notes

This is intentionally a thin UX-polish PR. Bigger UI overhauls are
deferred. Per-row webhook URLs come from the existing data; nothing
goes to the API.
