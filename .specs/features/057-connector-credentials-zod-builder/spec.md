# Connector Credentials Zod Builder — Specification

## Problem Statement

The CRM connector port inherits the same `credentials: unknown` disease 056
just fixed for channels: `CRMConnector.parseWebhook/fetchLead/fetchOwner/
logActivity/moveStage/markLost/setField/directory` all sign as `credentials:
unknown`, and every Pipedrive method opens with
`pipedriveCredentialsSchema.parse(credentials)`. On the web side it's worse:
operators paste **raw JSON** into a `<textarea>` and validation is a
`parseJsonObject` + `.superRefine` hack. The connector manifest exposes
`configSchema` but no `credentialFields` — the form has no idea which fields
to render.

## Goals

- [ ] `CRMConnector<S>` generic on a Zod schema; every credentials parameter
      is `z.infer<S>`. No `.parse(credentials)` calls inside connector method
      bodies.
- [ ] `defineCrmConnector(spec)` factory captures `S` and derives the
      manifest's `credentialFields` from the schema via the shared walker
      from 056.
- [ ] Pipedrive credentials schema lives in `@kizunu/api-contracts/crm/`
      with `.register(credentialFieldRegistry, {...})` annotations. The API
      module imports it from the contracts package.
- [ ] `CrmConnectorRegistry` exposes typed-bridge methods for every CRM
      port method; use-cases and services go through the bridge.
- [ ] New `GET /connectors` endpoint returning `{ id, name, capabilities,
      credentialFields }` — mirror of the existing `GET /channel-plugins`
      response.
- [ ] Web's `connector-account-form.tsx` replaces the JSON textarea with the
      same `CredentialFieldsInput` channels uses, driven by the new endpoint
      and validated client-side with `zodResolver(pipedriveCredentialsSchema)`.
- [ ] `bun check` green.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Adding a second connector (HubSpot etc.) | Not the refactor's job. |
| Channel module changes | Already done in 056. |
| Member-identity / entry-trigger UI surfaces | Use a different shape; not touched here. |
| Adding new `CredentialFieldType` kinds | `text|secret` is enough for Pipedrive. |
| Switching `parseWebhook`'s `config` parameter to typed (it's a different schema concept — webhook-config vs credentials) | Stays as today. |

## User Stories

### P1: Connector author handles typed credentials end-to-end ⭐ MVP

**User Story**: As a CRM-connector author, I want my connector methods to
take and return my Zod-inferred credentials type, so that I stop re-parsing
on every call and the registry is the single seam.

**Acceptance Criteria**:

1. WHEN `PipedriveConnector` is declared via `defineCrmConnector(spec)` with
   `pipedriveCredentialsSchema` as its `configSchema`, THEN TypeScript SHALL
   infer `PipedriveCredentials` for the `credentials` parameter of
   `fetchLead`, `fetchOwner`, `logActivity`, `moveStage`, `markLost`,
   `setField`, and `directory`.
2. WHEN those methods are called via the registry's typed-bridge methods,
   THEN the body SHALL receive already-parsed credentials and SHALL NOT
   call `schema.parse` again.

**Independent Test**: `bun typecheck` + Pipedrive unit tests pass against
the new shape.

### P1: Registry parses credentials at a single seam ⭐ MVP

**User Story**: As a use-case author, I want
`registry.fetchLead/fetchOwner/logActivity/moveStage/markLost/setField/directory`
typed bridges so that I never call `connector.X(externalId, ..., raw)`
directly.

**Acceptance Criteria**:

1. WHEN a use-case needs to call a CRMConnector method, THEN it SHALL go
   through the corresponding `registry.<method>(...)`.
2. WHEN the bridge receives credentials that fail `configSchema.safeParse`,
   THEN it SHALL throw `InvalidConnectorCredentialsException(id)` (today's
   422 envelope unchanged).
3. WHEN an optional method (`fetchOwner`, `directory`) is absent on the
   connector, THEN the bridge SHALL surface a typed exception (matches
   the channel registry's parity).

**Independent Test**: All CRM use-case unit + e2e specs pass after migration.

### P1: Pipedrive credentials schema lives in contracts with `.register()` ⭐ MVP

**Acceptance Criteria**:

1. WHEN `pipedriveCredentialsSchema` and its `PipedriveCredentials` type are
   imported, THEN they SHALL be imported from `@kizunu/api-contracts/crm`
   (NOT from the API plugin module).
2. WHEN the schema is registered via
   `.register(credentialFieldRegistry, {...})` on every operator-facing
   field, THEN `describeCredentialFields(pipedriveCredentialsSchema)`
   SHALL emit the expected flat field list.

### P1: `GET /connectors` endpoint mirrors `GET /channel-plugins` ⭐ MVP

**Acceptance Criteria**:

1. WHEN the operator GETs `/connectors`, THEN the response SHALL be
   `{ connectors: [{ id, name, capabilities, credentialFields }] }` with
   the same wire shape as the channels endpoint (just a different bag name).
2. WHEN Pipedrive is the only registered connector, THEN its
   `credentialFields` array SHALL contain `apiToken`, `companyDomain`,
   `activityType`, `phoneFieldKey` (and `webhookToken` — IF that field is
   surfaced in the schema; see Edge Cases below).

### P1: Web form uses per-connector zodResolver, drops the JSON textarea ⭐ MVP

**Acceptance Criteria**:

1. WHEN the operator picks a connector, THEN the form SHALL render per-field
   inputs driven by the new endpoint's `credentialFields`.
2. WHEN the operator submits with an invalid/missing field, THEN the form
   SHALL show a per-field error from `zodResolver(pipedriveCredentialsSchema)`.
3. WHEN the operator submits valid credentials, THEN the POST body's
   `credentials` SHALL be the schema-parsed object — no raw JSON, no
   `parseJsonObject` call.

## Edge Cases

- WHEN a connector lacks a registered field in the schema, THEN the walker
  falls back to `label = key`, `type = text` (mirrors channel behaviour).
- WHEN the `webhookToken` field on Pipedrive is per-account server-generated
  (today it's not in the operator's form but stamped on a per-account hook),
  THEN the schema MAY mark it `serverGenerated: true` so the wire response
  filters it from the form's input list — but only if Pipedrive currently
  treats it that way. (See design notes.)
- WHEN persisted Pipedrive credentials fail a tightened schema, the
  registry's bridges throw `InvalidConnectorCredentialsException` and the
  caller sees the existing 422 envelope.

## Requirement Traceability

| ID | Story | Phase |
|----|-------|-------|
| CCZB2-01 | P1 typed-end-to-end | Design |
| CCZB2-02 | P1 typed-end-to-end | Design |
| CCZB2-03 | P1 registry bridges | Design |
| CCZB2-04 | P1 registry bridges | Design |
| CCZB2-05 | P1 schema in contracts | Design |
| CCZB2-06 | P1 schema in contracts | Design |
| CCZB2-07 | P1 GET /connectors | Design |
| CCZB2-08 | P1 GET /connectors | Design |
| CCZB2-09 | P1 web form | Design |
| CCZB2-10 | P1 web form | Design |
| CCZB2-11 | P1 web form | Design |
| CCZB2-E1 | Edge: walker fallback | Design |
| CCZB2-E2 | Edge: serverGenerated webhookToken | Design |
| CCZB2-E3 | Edge: tightened schema 422 | Design |

## Success Criteria

- [ ] `rg "pipedriveCredentialsSchema.parse" apps/api/src/modules/crm/plugins/` returns 0 hits.
- [ ] `rg "credentials: unknown" apps/api/src/modules/crm/` returns 0 hits inside `PipedriveConnector` bodies.
- [ ] `rg "parseJsonObject\|credentialsRaw" apps/web/src/routes/_app/settings/connectors/` returns 0 hits.
- [ ] `defineCrmConnector` exists and `PipedriveConnector` is built from it.
- [ ] `GET /connectors` returns the credentialFields list.
- [ ] `bun check` green.
