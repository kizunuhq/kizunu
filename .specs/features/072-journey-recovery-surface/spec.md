# Journey recovery web surface — Specification

## Problem Statement

Feature 071 surfaces `errorReason` strings on the journeys list. The
strings are operator-unfriendly (`no_channel`, `owner_not_mapped`).
This slice maps each reason to a human label + a "Fix it →" link to the
settings page that owns the broken resource.

## Goals

- [ ] The web journeys table replaces the raw `errorReason` cell with a
      `JourneyErrorCell` composed primitive: human label (e.g. "No
      channel access") + a small "Fix it →" link to the right settings
      page.
- [ ] Six reasons mapped, mirroring `LeadJourneyErrorReason` from the
      engine domain:
      `no_channel`, `template_required`, `owner_not_mapped`,
      `owner_lookup_failed`, `template_variable_missing`,
      `template_variable_unknown`.
- [ ] Unknown reasons fall through to a "Provider failure" label with a
      link to `/settings/channels` (the catch-all for provider issues).

## Out of Scope

- Bulk fix operations.
- Inline retry from the journeys table.

## Acceptance Criteria

1. WHEN `row.errorReason === 'no_channel'` THEN cell SHALL render "No
   channel access" + link to `/settings/channels`.
2. WHEN `row.errorReason === 'owner_not_mapped'` THEN cell SHALL render
   "Owner not mapped" + link to `/settings/connectors`.
3. WHEN `row.errorReason === 'template_required'` THEN cell SHALL render
   "Template required" + link to `/workspace/cadences`.
4. WHEN `row.errorReason` starts with `template_variable_` THEN cell
   SHALL render the variable name + link to `/workspace/cadences`.
5. WHEN `row.errorReason === 'owner_lookup_failed'` THEN cell SHALL
   render "Owner lookup failed" + link to `/settings/connectors`.
6. WHEN `row.errorReason` is null THEN cell SHALL render "—" (current
   behavior preserved).
