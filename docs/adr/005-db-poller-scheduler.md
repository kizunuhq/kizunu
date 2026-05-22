# ADR-005: In-Process DB Poller as the Scheduler, Not BullMQ/Redis

- **Date**: 2026-05-22
- **Status**: Accepted
- **Deciders**: Kizunu team
- **Tags**: scheduler, persistence, infrastructure, v0.1

## Context and Problem Statement

v0.1 needs to dispatch follow-up touches when `LeadJourney.nextTouchAt` comes due. The original scope ([../v0.1-scope.md](../v0.1-scope.md)) left the scheduler open: in-process cron vs. an external queue such as BullMQ on Redis. Onboarding the first pilot forces the call. The documented motivation for BullMQ was restart resilience.

## Decision Drivers

- Restart resilience — a process restart must not lose scheduled touches.
- Cancellation — a lead reply must stop a future follow-up cleanly.
- Operational simplicity for the pilot's volume (1–5 BDRs, low throughput) — fewer pieces to self-host.

## Considered Options

- **A** — In-process DB poller: a NestJS cron polls `LeadJourney.nextTouchAt <= now`.
- **B** — External queue (BullMQ on Redis) with scheduled/delayed jobs.

## Decision Outcome

Chosen option: **A**. Touch dispatch runs from a NestJS cron that polls `LeadJourney.nextTouchAt <= now`. No Redis, no BullMQ.

Restart resilience comes from persisting `nextTouchAt` in Postgres — a restart loses nothing. Cancelling a future follow-up needs no job cancellation: the poller skips any journey whose `status != 'running'`, so a reply that flips the status to `replied` stops the cadence with no queue surgery.

### Positive Consequences

- One fewer piece of infrastructure to self-host for the pilot.
- Restart-safe by construction (state lives in the database).
- Cancellation is a status check, not a queue operation.

### Negative Consequences

- Coarser time granularity than a queue, and does not scale to high volume as cleanly. Reassess BullMQ when volume requires it.

## Pros and Cons of the Options

### A — In-process DB poller ✅ Chosen
- ✅ No extra infra; restart-safe via Postgres; trivial cancellation
- ❌ Coarse granularity; weaker at high volume

### B — BullMQ / Redis
- ✅ Fine-grained scheduling, scales to high volume
- ❌ Extra infra to self-host; redundant resilience over persisted `nextTouchAt`; job cancellation needed for replies

## Links

- Context: [../v0.1-scope.md](../v0.1-scope.md) — the dispatch/reply race is resolved with a pessimistic row lock (`SELECT … FOR UPDATE`), see Decisions #1.
- Related: [004-meta-coex-channel.md](004-meta-coex-channel.md)
