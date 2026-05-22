# Engine Ingestion Design

Extends `apps/api/src/modules/engine/`.

```
engine/
├── core/
│   ├── use-cases/start-journey.use-case.ts (+ __test__)
│   └── errors/ (reuse)
├── http/controllers/crm-webhook.controller.ts   # public, per-connector
└── persistence/{lead,lead-journey}.repository.ts
```

## Tables

```ts
leads = pgTable('leads', {
  ...defaults(),
  workspaceId -> workspaces (cascade),
  connectorAccountId -> connector_accounts (cascade),
  externalId: varchar(120),       // CRM deal id
  ownerExternalId: varchar(120),  // nullable; CRM owner id
  ownerUserId -> users (set null, nullable),
  name: varchar(255),
  phone: varchar(40),             // nullable
}, uniqueIndex(connectorAccountId, externalId))

leadJourneyStatusEnum = pgEnum('lead_journey_status', [...LeadJourneyStatus values])
// Assert<Equal<enumValues[number], LeadJourneyStatus>> guard

leadJourneys = pgTable('lead_journeys', {
  ...defaults(),
  leadId -> leads (cascade),
  cadenceId -> cadences (cascade),
  status: leadJourneyStatusEnum().notNull().default('running'),
  currentStepOrder: integer().notNull().default(-1),
  nextTouchAt: timestamp({ withTimezone: true }),  // nullable
}, index(status, nextTouchAt))   // the poller's lookup index
```

The status enum values are derived from `LeadJourneyStatus` (engine domain), conforming
via the `Assert<Equal>` guard (ADR 002/003), same as `verification_tokens`.

## StartJourneyUseCase

Input `{ workspaceId, connectorAccountId, connectorId, credentials, event }`.

```
trigger = entryTriggers.findCadenceByStage(connectorAccountId, event.stageId)   // re-added here
if !trigger -> return                                                           // no mapping, no-op
existing = journeys.findNonTerminalByLeadCadence(...)  // after lead upsert
lead = registry.get(connectorId).fetchLead(event.externalId, credentials)
leadId = leads.upsert({ workspaceId, connectorAccountId, externalId, ownerExternalId, name, phone })
if journeys.hasNonTerminal(leadId, trigger.cadenceId) -> return                  // idempotent
firstDelay = cadences.firstStepDelayMinutes(trigger.cadenceId)                   // new repo method
nextTouchAt = now + firstDelay minutes
journeys.create({ leadId, cadenceId: trigger.cadenceId, status running, currentStepOrder -1, nextTouchAt })
```

`now` is injected (a `Clock` or `() => Date`) for testability. `firstStepDelayMinutes`
is added to `CadenceRepository` (min stepOrder's delay); has a real consumer here.
`findCadenceByStage` is re-added to `EntryTriggerRepository` (now consumed).
`ConnectorAccountRepository.findById` (not workspace-scoped) is added for the public
webhook to resolve the account + credentials.

## CRM webhook controller (`crm-webhook.controller.ts`, `@Public()`)

`POST /webhooks/crm/:connectorAccountId`: `connectors.findById` (404 if absent),
`registry.get(connectorId).parseWebhook(rawBody)`, then for each event call
`StartJourneyUseCase`. Always returns `{ received: n }` with 200. Raw body via `@Body()`
typed `unknown`.

## Repositories

- `LeadRepository`: `upsert` (insert … on conflict (connectorAccountId, externalId) do
  update set name/phone/ownerExternalId, returning id).
- `LeadJourneyRepository`: `hasNonTerminal(leadId, cadenceId)`, `create`.

`Routes`: add `crmWebhook: (connectorAccountId) => /webhooks/crm/${connectorAccountId}`.
No client hook (Pipedrive calls it, not the SPA).

## Test strategy (generate-tests)

- **Fat (unit):** `StartJourneyUseCase` — no trigger → no-op; trigger → lead upsert +
  journey create with computed `nextTouchAt`; idempotent re-entry (hasNonTerminal true →
  no create). Fakes for registry/repos + a fixed clock.
- **Integration:** `lead.repository` upsert conflict behavior; `lead-journey.repository`
  hasNonTerminal/create against `kizunu_test`.
- **Thin:** webhook controller (resolve + parse + delegate) — covered by the use-case +
  a light parse check.
</content>
