# Engine Dispatcher Tasks

## T1 — touch_attempts schema + migration + repo — DSP-03
Schema + `bun db:generate`; `touch-attempt.repository.ts` (tryInsert onConflictDoNothing, recordResult).
Gate: typecheck + drizzle gates.

## T2 — pure helpers + executor — DSP-04
`next-step.ts` (resolveNextStep), `jitter.ts` (Jitter); `cadence-action-executor.ts` (handler map by action type).
Gate: typecheck.

## T3 — repo seams + dispatcher — DSP-01, DSP-02, DSP-04
LeadJourneyRepository findDueIds/lockById/advance/setStatus; ChannelAccountRepository.findCredentials;
`journey-dispatcher.ts` (dispatchDue + dispatchOne in a tx with row lock).
Gate: typecheck.

## T4 — poller + module wiring — DSP-05
`journey-poller.ts` (setInterval, skipped in test env); add POLL config; register in engine.module.
Gate: `bun check`.

## T5 — tests (generate-tests) — DSP-01..05
Unit: resolveNextStep, executor. Integration: dispatchOne (send+attempt+activity+advance; no-channel→error;
validate-error→error; exhaust→onExhausted) against kizunu_test with faked plugin/connector registries;
touch-attempt idempotency; findDueIds selects only running+due.
Gate: `bun check` + CI lint.

## T6 — docs
ROADMAP/STATE/STRUCTURE/CONCERNS (sendingWindow + owner-mapping deferrals), ADR-005 note.
Gate: `bun check`.
</content>
