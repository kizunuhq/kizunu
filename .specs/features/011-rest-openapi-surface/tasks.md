# REST + OpenAPI Surface Tasks

## T1 — lead-journeys list API — API-03
`LeadJourneyRepository.listByWorkspace`; `ListLeadJourneysUseCase`; contract + Routes;
`lead-journey.controller.ts` (admin); client hook; wire into engine.module.
Gate: typecheck + zod-v4.

## T2 — OpenAPI document + UI — API-01
`shared/http/openapi.ts` (DocumentBuilder + cleanupOpenApiDoc); `main.ts` SwaggerModule.setup('docs').
Gate: typecheck.

## T3 — controller tags — API-02
`@ApiTags` on each controller.
Gate: `bun check`.

## T4 — tests (generate-tests) — API-01, API-03
Integration: listByWorkspace (+ status filter). e2e: build OpenAPI doc, assert key paths + a schema.
Gate: `bun check` + CI lint.

## T5 — docs
ROADMAP (REST+OpenAPI line), STATE, STRUCTURE, INTEGRATIONS (docs endpoint), STACK (swagger dep).
Gate: `bun check`.
</content>
