# Safe launch readiness gate — Specification

## Problem Statement

The setup wizard shows step-by-step completion but it does not tell the
operator "yes, this workspace can actually launch the pilot now."
Existing health/readiness signals (060 connector, 061 channel, 062
routing) plus the wizard's six step badges already cover the substance;
this slice consolidates the answer into a single banner above the
checklist.

## Goals

- [ ] The wizard renders a launch banner at the top derived from the
      same six step statuses + per-resource health checks.
- [ ] Banner states:
  - **All ready** (green) — every step Done + every connector/channel
    health `ready`.
  - **Mostly ready, X warnings** (amber) — every step Done but at least
    one connector/channel reports `degraded`.
  - **Not ready** (default) — any step Not started.
  - **Loading** (skeleton) — at least one underlying query is pending.

## Out of Scope

- Activation/deactivation of triggers from the wizard (out of pilot
  scope — operator toggles in Pipedrive).
- Persisted "I am launching" state.

## Acceptance Criteria

1. WHEN all six steps are Done AND every connector health is `ready`
   AND every channel health is `ready` THEN the banner SHALL show
   "All systems ready — launch when you are.".
2. WHEN steps are Done but a health is `degraded` THEN the banner
   SHALL show a warning summary.
3. WHEN any step is Not started THEN the banner SHALL show "Not ready
   — complete the steps below.".
4. WHEN any source is loading THEN the banner SHALL show a neutral
   "Checking readiness…" state.

The banner SHALL use the existing shadcn Alert primitive (or fall back
to a Card with the same look) — no new primitive.
