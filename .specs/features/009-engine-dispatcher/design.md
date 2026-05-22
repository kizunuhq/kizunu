# Engine Dispatcher Design

Extends `apps/api/src/modules/engine/`.

```
engine/
├── core/
│   ├── domain/
│   │   ├── next-step.ts                 # pure resolveNextStep(currentStepOrder, stepCount)
│   │   └── jitter.ts                    # Jitter.apply(delayMinutes, jitterMinutes)
│   ├── services/
│   │   ├── cadence-action-executor.ts   # closed-vocabulary action dispatch
│   │   └── journey-dispatcher.ts        # dispatchDue() + per-journey dispatch (tx + lock)
│   └── poller/journey-poller.ts         # setInterval, OnModuleInit/OnModuleDestroy
└── persistence/touch-attempt.repository.ts
```

Table `apps/api/src/db/schemas/touch-attempts.ts`:

```ts
touchAttempts = pgTable('touch_attempts', {
  ...defaults(),
  leadJourneyId -> lead_journeys (cascade),
  stepOrder: integer().notNull(),
  status: varchar(20).notNull(),          // 'sent' | 'failed' | 'skipped'
  externalMessageId: varchar(255),
  externalActivityId: varchar(255),
  error: text(),
}, uniqueIndex(leadJourneyId, stepOrder))
```

## Pure helpers

`resolveNextStep(currentStepOrder, stepCount)`:
- `next = currentStepOrder + 1`; if `next >= stepCount` → `{ kind: 'exhausted' }`,
  else `{ kind: 'dispatch', stepOrder: next }`. Unit-tested.

`Jitter.apply(delayMinutes, jitterMinutes)` → `delayMinutes + random(0..jitterMinutes)`;
injectable so tests force zero jitter.

## CadenceActionExecutor

`execute(actions: CadenceAction[], ctx: { connector, credentials, externalId })`. Dispatch
by `action.type` through a `Record<type, handler>` (not a switch):
- `move_stage` → `connector.moveStage`, `mark_lost` → `connector.markLost`,
  `log_activity` → `connector.logActivity`, `set_field` → `connector.setField`.
- `notify_user` → internal (logged for v0.1), `webhook_out` → `fetch` POST (injectable).
Fat (the handler map + per-type calls) → unit-tested with a fake connector.

## JourneyDispatcher

`dispatchDue(now)`:
1. `journeys.findDueIds(now, BATCH)` (ids only, no lock).
2. For each id: `db.transaction(tx => dispatchOne(tx, id, now))`. A failure in one
   journey's tx does not abort the batch (logged, continue).

`dispatchOne(tx, id, now)`:
- `journeys.lockById(tx, id)` (`SELECT … FOR UPDATE`); re-check `status === 'running'`
  and still due → else return (the inbound handler may have won the lock first).
- load lead + cadence steps + the lead's connector account (credentials).
- `resolveNextStep`: exhausted → `transition(running, exhaust)` → `setStatus exhausted`,
  `executor.execute(cadence.onExhausted, crmCtx)`; return.
- resolve channel: `channelAccess.findPrimaryAccount(lead.ownerUserId, step.channelPluginId)`
  → none → `setStatus error_state`; return. Load channel account credentials.
- `touchAttempts.tryInsert(tx, id, stepOrder)` → false (exists) → return (idempotent).
- `validate` (plugin) with `{ now, hasApprovedTemplate: !!step.templateId, lastInboundAt:
  undefined, capabilities }`; `action === 'error'` → record attempt `skipped`/`failed`,
  `setStatus error_state`; return.
- build `SendPayload` from the step's template (template mode); `plugin.send`; update the
  attempt with `externalMessageId`/status; `connector.logActivity` (the touch) → store
  `externalActivityId`.
- `journeys.advance(tx, id, stepOrder, nextTouchAt)` where `nextTouchAt = now +
  jitter.apply(followingStep.delay ?? lastStep.delay)`.

`now` from the injected `Clock`. Channel send needs `ChannelPluginRegistry` +
`ChannelAccountRepository.findCredentials`; CRM needs `CrmConnectorRegistry` +
`ConnectorAccountRepository`. Template fetched via `TemplateRepository.findByIdInWorkspace`.

## Repositories (additions)

- `LeadJourneyRepository`: `findDueIds(now, limit)`, `lockById(tx, id)` (returns journey +
  lead + connectorAccountId), `advance(tx, id, stepOrder, nextTouchAt)`, `setStatus(tx, id, status)`.
- `TouchAttemptRepository`: `tryInsert(tx, journeyId, stepOrder)` (onConflictDoNothing,
  returning id), `recordResult(tx, id, { status, externalMessageId, externalActivityId, error })`.
- `ChannelAccountRepository.findCredentials(id)` (engine seam — credentials for send).

## Poller

`JourneyPoller implements OnModuleInit, OnModuleDestroy`: `setInterval(() =>
dispatcher.dispatchDue(clock.now()), POLL_INTERVAL_MS)` on init, `clearInterval` on
destroy. Interval from config (default 15s). Skipped under `NODE_ENV=test` (no timer in
tests; dispatch is driven directly).

## Test strategy (generate-tests)

- **Fat (unit):** `resolveNextStep` (dispatch vs exhausted incl. boundary);
  `CadenceActionExecutor` (each action routes to the right connector call / internal);
  `JourneyDispatcher.dispatchOne` branch behavior with all collaborators faked
  (send+attempt+activity+advance; no-channel→error; validate-error→error; exhaust→onExhausted).
- **Integration:** `touch_attempts` unique-idempotency (`tryInsert` twice → one row);
  `findDueIds` selects only running + due.
- **Thin:** the poller (`setInterval` wiring) — not unit-tested; `dispatchDue` is.
</content>
