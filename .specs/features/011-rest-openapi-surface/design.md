# REST + OpenAPI Surface Design

## OpenAPI document

`apps/api/src/shared/http/openapi.ts`:

```ts
export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('Kizunu API')
    .setDescription('Sales engagement engine — v0.1')
    .setVersion('0.1')
    .addCookieAuth('kizunu_session')
    .build()
  return cleanupOpenApiDoc(SwaggerModule.createDocument(app, config))
}
```

`main.ts` `bootstrap()`: after pipes, `SwaggerModule.setup('docs', app, buildOpenApiDocument(app))`
→ `/docs` (UI) and `/docs-json`. Doc generation is pure (no DB), so an e2e test can build
it from the test app and assert paths/schemas without `main.ts`.

## Controller tags

Add `@ApiTags('<domain>')` to each controller: auth, workspaces, channels, crm, templates,
cadences, entry-triggers, webhooks, lead-journeys, health. One decorator per controller.

## Lead journeys list

`engine` module:
- `LeadJourneyRepository.listByWorkspace(workspaceId, status?)` → join lead + cadence,
  select id, leadName, cadenceId, status, currentStepOrder, nextTouchAt; filter by status
  when given.
- `ListLeadJourneysUseCase` (thin passthrough).
- `lead-journey.controller.ts` (admin, `WorkspaceAdminGuard`): `GET :id/lead-journeys`
  with a `status` query DTO (`createZodDto`).
- Contract `api-contracts/engine/lead-journey.contract.ts` (list response + status enum)
  + `Routes.leadJourneys.collection(workspaceId)`.
- Client hook `api-client/engine/use-lead-journeys.ts`.

Query status validated by a zod enum of `LeadJourneyStatus` values.

## Test strategy (generate-tests)

- **Integration:** `LeadJourneyRepository.listByWorkspace` (all + status filter) against
  `kizunu_test`.
- **e2e:** build the OpenAPI document from the test app; assert it includes key paths
  (`/auth/login`, `/workspaces/{id}/cadences`, `/workspaces/{id}/lead-journeys`,
  `/webhooks/crm/{connectorAccountId}`) and at least one component schema.
- **Thin:** the journeys controller + use-case are passthrough.
</content>
