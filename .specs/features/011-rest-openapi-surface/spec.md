# REST + OpenAPI Surface Specification

## Problem Statement

The v0.1 scope wants "REST + OpenAPI from day one" and CRUD for every domain entity.
The REST surface is largely built (auth, workspace, channel, crm, templates, cadences,
entry-triggers, webhooks), but two gaps remain: there is no machine-readable API
description, and `LeadJourney` — which the BDR/admin must see (active/paused/error) — has
no read endpoint. This slice exposes an OpenAPI document + Swagger UI and adds the
journeys list API.

## Goals

- [ ] Generate an OpenAPI 3 document from the existing controllers + zod DTOs
      (`@nestjs/swagger` + nestjs-zod `cleanupOpenApiDoc`), served at `/docs` (UI) and
      `/docs-json`.
- [ ] Tag controllers by domain so the document is navigable.
- [ ] `GET /workspaces/:id/lead-journeys?status=` — list a workspace's journeys
      (id, lead name, cadence id, status, currentStepOrder, nextTouchAt), optionally
      filtered by status.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Full CRUD for every entity (connector update/delete, entry-trigger update) | Minor gaps; the current surface covers the pilot. Documented, not built here |
| Web UI screens consuming the journeys list | Minimum UI feature |
| Auth on `/docs` | v0.1 self-host exposes docs openly; gate later if needed |

---

## User Stories

### P1: OpenAPI document + Swagger UI ⭐ MVP

**Acceptance Criteria**:

1. WHEN the app boots THEN `GET /docs-json` SHALL return an OpenAPI 3 document whose
   `paths` include the existing routes (e.g. `/auth/login`, the workspace cadences
   collection, `/webhooks/crm/{connectorAccountId}`).
2. WHEN a request DTO is a `createZodDto` THEN its schema SHALL appear in the document
   (via nestjs-zod), with no leftover internal zod artifacts (`cleanupOpenApiDoc`).
3. WHEN `/docs` is opened THEN Swagger UI SHALL render the grouped (tagged) operations.

**Independent Test**: build the document from the booted test app and assert it contains
key tagged paths and component schemas.

### P1: List lead journeys ⭐ MVP

**Acceptance Criteria**:

1. WHEN an admin lists `/workspaces/:id/lead-journeys` THEN the response SHALL include
   the workspace's journeys with lead name, cadence id, status, step, and next touch.
2. WHEN `?status=` is provided THEN only journeys with that status SHALL be returned.
3. WHEN a non-admin calls it THEN it SHALL reject (403).

**Independent Test**: integration — seed journeys of mixed status; assert list + filter.

---

## Edge Cases

- WHEN the workspace has no journeys THEN the list is `[]`.
- WHEN `?status=` is an invalid value THEN the request is rejected by the query schema.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| API-01 | P1: OpenAPI doc + UI | Tasks | Pending |
| API-02 | P1: controller tags | Tasks | Pending |
| API-03 | P1: list lead journeys | Tasks | Pending |

**Coverage:** 3 total, mapped to tasks.

---

## Success Criteria

- [ ] `bun check` green; CI-strict lint clean.
- [ ] `/docs-json` is a valid OpenAPI 3 doc covering the API; `/docs` renders.
- [ ] Journeys are listable + status-filterable for a workspace.
</content>
