# Engine Inbound Reply Specification

## Problem Statement

The pilot's defining behavior: any reply from a lead immediately pauses the cadence and
moves the deal to "Replied/Scheduling". This slice adds the app-level Meta inbound
webhook (`hub.verify_token` subscribe verification + message receiver) that routes a
reply by `phone_number_id` to the right `LeadJourney`, transitions it to `replied`
under the same row lock the dispatcher uses (D1), and runs the cadence's `onReply`
actions via the executor.

## Goals

- [ ] `GET /webhooks/meta` — subscribe verification: echo `hub.challenge` when
      `hub.verify_token` matches the configured token, else 403.
- [ ] `POST /webhooks/meta` — parse inbound via the Meta plugin, route each message to a
      `ChannelAccount` by `phone_number_id`, and mark the matching running journey
      `replied` + run `onReply`. Always acknowledge 200.
- [ ] `MarkReplyUseCase`: lock the journey, transition `→ replied` (D1 race), execute
      `onReply` actions through the CRM connector.

## Out of Scope

| Feature | Reason |
| --- | --- |
| `paused_owner_inactive` + bulk reassign | Avoids a workspace↔engine module cycle; separate slice |
| Inbound conversation/inbox storage | UI/inbox feature |
| Per-`ChannelAccount` inbound URL | The single app-level webhook + `phone_number_id` routing is enough for v0.1 |

---

## User Stories

### P1: Verify the Meta webhook subscription ⭐ MVP

**Acceptance Criteria**:

1. WHEN `GET /webhooks/meta?hub.mode=subscribe&hub.verify_token=T&hub.challenge=C` and
   `T` matches the configured token THEN it SHALL respond 200 with body `C`.
2. WHEN the token does not match THEN it SHALL respond 403.

### P1: A reply pauses the cadence ⭐ MVP

**Acceptance Criteria**:

1. WHEN an inbound message arrives whose `phone_number_id` matches a `meta-whatsapp`
   `ChannelAccount` and whose sender matches a running journey's lead phone (same
   workspace) THEN that journey SHALL become `replied` and the cadence's `onReply`
   actions SHALL run (e.g. `move_stage`).
2. WHEN no channel account matches the `phone_number_id`, or no running journey matches
   the sender THEN the webhook SHALL still respond 200 and change nothing.
3. WHEN the journey is already terminal THEN the reply SHALL be ignored (no illegal
   transition).
4. The reply transition SHALL take the journey row lock so it serializes with the
   dispatcher (first to commit wins — D1).

**Independent Test**: `MarkReplyUseCase` against Postgres with a fake CRM connector —
running journey → `replied` + `onReply` ran; terminal journey → unchanged.

---

## Edge Cases

- WHEN a payload carries multiple messages THEN each is routed independently.
- WHEN the same reply is delivered twice THEN the second finds the journey already
  `replied` (no running match) → no-op.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| RPL-01 | P1: webhook verify | Tasks | Pending |
| RPL-02 | P1: route + mark replied + onReply | Tasks | Pending |
| RPL-03 | P1: ignore non-matching / terminal | Tasks | Pending |

**Coverage:** 3 total, mapped to tasks.

---

## Success Criteria

- [ ] `bun check` green; CI-strict lint clean.
- [ ] A reply provably moves a running journey to `replied` and runs `onReply`, under the
      row lock, idempotently against redelivery.
</content>
