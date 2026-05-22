# Engine Ingestion Tasks

## T1 — leads + lead_journeys schema + migration — ING-01..03
Schema (lead_journeys status enum conforms to LeadJourneyStatus via Assert<Equal>); `bun db:generate`.
Gate: typecheck + drizzle gates.

## T2 — repositories + repo seams — ING-01..03
`lead.repository.ts` (upsert), `lead-journey.repository.ts` (hasNonTerminal, create);
re-add `EntryTriggerRepository.findCadenceByStage`; add `CadenceRepository.firstStepDelayMinutes`
and `ConnectorAccountRepository.findById`.
Gate: typecheck.

## T3 — StartJourneyUseCase — ING-01..03
Inject registry + repos + clock; resolve trigger, upsert lead, idempotent journey create.
Gate: typecheck.

## T4 — CRM webhook controller + wiring — ING-04
`crm-webhook.controller.ts` (@Public, resolve account, parse, delegate); `Routes.crmWebhook`;
register use-case + repos in engine.module; provide a Clock.
Gate: `bun check`.

## T5 — tests (generate-tests) — ING-01..04
Unit: StartJourneyUseCase (no-op / create / idempotent). Integration: lead upsert + lead-journey repos.
Gate: `bun check` + CI lint.

## T6 — docs
ROADMAP/STATE/STRUCTURE/INTEGRATIONS (CRM webhook now built), CONCERNS (webhook auth).
Gate: `bun check`.
</content>
