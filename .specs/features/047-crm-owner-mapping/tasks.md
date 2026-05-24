# 047 — CRM Owner Mapping Tasks

**Design**: `.specs/features/047-crm-owner-mapping/design.md`
**Spec**: `.specs/features/047-crm-owner-mapping/spec.md`
**Context**: `.specs/features/047-crm-owner-mapping/context.md`
**Status**: Approved

---

## Execution Plan

### Phase 1 — Foundation (schemas, ports, domain types)

T1 → T2 → T3 → T4

### Phase 2 — Persistence + connector wiring

T5 → T6 → T7 → T8 → T9

### Phase 3 — Core services + use cases

T10 → T11 → T12 → T13

### Phase 4 — HTTP edge + e2e

T14 → T15 → T16

### Phase 5 — Web admin UI

T17 → T18

### Phase 6 — P2 BDR self-visibility

T19

### Phase 7 — Docs close-out

T20

---

## Task Breakdown

### T1: Add domain enum + types

**What:** Create `LeadJourneyErrorReason` const object (`apps/api/src/modules/engine/core/domain/lead-journey-error-reason.ts`), `NormalizedOwner` interface (`apps/api/src/modules/crm/core/connector/normalized-owner.ts`), and `MemberConnectorIdentity` domain type (`apps/api/src/modules/crm/core/identity/member-connector-identity.ts`). One file per type per `code-standards.md` §11.

**Where:**
- `apps/api/src/modules/engine/core/domain/lead-journey-error-reason.ts` (new)
- `apps/api/src/modules/crm/core/connector/normalized-owner.ts` (new)
- `apps/api/src/modules/crm/core/identity/member-connector-identity.ts` (new)

**Depends on:** None
**Reuses:** Existing const-object pattern in `lead-journey-status.ts`; `defaults()` schema not needed at this layer
**Requirement:** Foundation for `OWNER-06`/`OWNER-07`/`OWNER-08` (errorReason), `OWNER-01`/`OWNER-02` (fetchOwner contract type), `OWNER-09`/`OWNER-10` (identity entity).

**Done when:**
- [ ] All three files exist with English identifiers, kebab-case names
- [ ] `LeadJourneyErrorReason` follows enums-rule §1 (const object + derived type, declaration-merged)
- [ ] Initial values: `NoChannel='no_channel'`, `TemplateRequired='template_required'`, `OwnerNotMapped='owner_not_mapped'`, `OwnerLookupFailed='owner_lookup_failed'`
- [ ] `NormalizedOwner` interface has `{ externalId, name, email: string | null }`
- [ ] `MemberConnectorIdentity` interface has all fields per design.md Data Models section
- [ ] Gate check passes: `bun typecheck`
- [ ] Test count: 0 new tests (pure type declarations — `Tests: none`)

**Verify:** `bun typecheck` clean; the three files import cleanly from elsewhere.

**Tests:** none
**Gate:** build (`bun typecheck`)

---

### T2: Schema + migration — `member_connector_identities` table + `lead_journeys.errorReason` column

**What:** Add the new table schema and the column on the existing schema. Generate the migration via `bun db:generate`. The migration MUST be generated, not hand-written (`.agents/rules/conventions.md` §3).

**Where:**
- `apps/api/src/db/schemas/member-connector-identities.ts` (new)
- `apps/api/src/db/schemas/lead-journeys.ts` (modify — add `errorReason` column)
- `apps/api/src/db/schema.ts` (modify — export the new table)
- `apps/api/drizzle/*.sql` + `apps/api/drizzle/.checksums.json` (auto-generated)

**Depends on:** T1 (the column type uses `varchar(80)` matching the const-object's max value length)
**Reuses:** `defaults()` mixin (uuid + timestamps), `pgTable`, `uniqueIndex`. Pattern from `connector-accounts.ts` and `leads.ts`.
**Requirement:** Foundation for `OWNER-04`, `OWNER-06`, `OWNER-09`, `OWNER-10`, `OWNER-17`.

**Done when:**
- [ ] `member_connector_identities` table per design.md schema (workspaceId/membershipId/connectorAccountId FK cascades, externalId varchar(120), createdBy varchar(80), sourceEmail varchar(255) nullable, two unique indexes)
- [ ] No explicit column names (conventions §2) — relies on `casing: 'snake_case'`
- [ ] `lead_journeys.errorReason: varchar({ length: 80 })` nullable
- [ ] Migration generated via `bun db:generate`; `.checksums.json` updated
- [ ] `bun scripts/check-drizzle-schema-naming.ts` passes
- [ ] `bun scripts/drizzle-checksums.ts verify` passes
- [ ] Gate check passes: `bun typecheck`

**Verify:** `bun db:generate` produces one new migration; `bun check` four script-checks pass; no manual `.sql` edits.

**Tests:** none (schema is a declaration; integration tests of repositories cover the live behavior)
**Gate:** build

---

### T3: Extend `CRMConnector` port — optional `fetchOwner?` method

**What:** Add `fetchOwner?(externalId, credentials): Promise<NormalizedOwner | null>` as an **optional** method on the frozen D3 port. Pattern mirrors `ChannelPlugin.onAccountCreated?` from feature 029.

**Where:**
- `apps/api/src/modules/crm/core/connector/crm-connector.ts` (modify)

**Depends on:** T1 (`NormalizedOwner` type)
**Reuses:** Existing port shape (signature mirrors `fetchLead`)
**Requirement:** `OWNER-01` (foundation).

**Done when:**
- [ ] Method declared as optional (`fetchOwner?:` not `fetchOwner:`)
- [ ] Return type `Promise<NormalizedOwner | null>`
- [ ] JSDoc on the method explains "optional — connectors that surface owner identities implement this; others skip auto-match"
- [ ] All existing connector implementations still typecheck (none implement it yet, optional → compiles)
- [ ] Gate check passes: `bun typecheck`

**Verify:** `bun typecheck` clean; the existing `FakeCrmConnector` (if any) does not break.

**Tests:** none (interface change; behavior validated through Pipedrive impl + service tests downstream)
**Gate:** build

---

### T4: Update `LeadJourneyRepository.setStatus` + `lockById` for `errorReason`

**What:** Extend `setStatus(tx, id, status, errorReason?)` to optionally write `errorReason` (and clear it when status ≠ `error_state`). Extend `lockById` projection to include `errorReason`. Mirrors are pure schema/repo plumbing; tests deferred to T6 + T11 where behavior is observable.

**Where:**
- `apps/api/src/modules/engine/persistence/lead-journey.repository.ts` (modify)

**Depends on:** T2 (column exists)
**Reuses:** Existing `setStatus` body — the change is additive
**Requirement:** `OWNER-06`, `OWNER-07`, `OWNER-08` (carrier mechanism).

**Done when:**
- [ ] `setStatus(tx, id, status, errorReason?: string | null)` writes `errorReason` when provided; sets it to `NULL` when status != `error_state` (defensive auto-clear on recovery)
- [ ] `lockById` SELECT adds `errorReason: leadJourneys.errorReason` to its projection; the `LockedJourney` interface gains `errorReason: string | null`
- [ ] No call-site break: existing callers (dispatcher feature 009) still compile because the new arg is optional
- [ ] Gate check passes: `bun typecheck`

**Verify:** `bun typecheck` clean; ripgrep for `setStatus(` finds 4-5 call sites, all still compile.

**Tests:** none here (covered by feature behavior tests in T6+T11+T15)
**Gate:** build

---

### T5: `MemberConnectorIdentityRepository` + integration tests

**What:** Implement the new repository with `findByExternal`, `listByConnectorAccount`, `listForUser`, `create`, `updateMembership`, `delete`. All methods accept an optional `tx: DbTransaction` where the use case composes them with backfill in one transaction. Integration tests cover the SQL behavior (unique constraints, joins, cascade).

**Where:**
- `apps/api/src/modules/crm/persistence/member-connector-identity.repository.ts` (new)
- `apps/api/src/modules/crm/persistence/__test__/integration/member-connector-identity.repository.spec.ts` (new)

**Depends on:** T2 (table), T1 (domain type)
**Reuses:** Pattern + idioms from `connector-account.repository.ts`; `DrizzleService.db`; `DbTransaction` type from `engine/persistence/transaction.ts` (already exported)
**Requirement:** `OWNER-09`, `OWNER-10`, `OWNER-13`, `OWNER-15`, `OWNER-16`.

**Done when:**
- [ ] All six methods implemented per design.md interfaces
- [ ] `listByConnectorAccount` joins `memberships` + `users` and returns the shape the contract requires (`{ id, membershipId, userId, userEmail, userName, externalId, createdBy, sourceEmail, createdAt }`)
- [ ] `create` uses `ON CONFLICT DO NOTHING` against `mci_account_external_idx` and `mci_account_membership_idx` so race-on-auto-create is safe
- [ ] No magic numbers (code-standards §4); functions under 30 lines (§10)
- [ ] Integration spec (via `generate-tests`) covers: insert + read by external; uniqueness violation on duplicate (account, externalId); uniqueness violation on duplicate (account, membership); listByConnectorAccount joins correctly; cascade on membership delete
- [ ] Gate check passes: `bun test:integration` (the new spec plus existing harness)
- [ ] Test count: existing + new spec passes

**Verify:** `bun test:integration` green; the integration spec exercises each method against `kizunu_test`.

**Tests:** integration (per TESTING.md matrix — repositories with non-trivial query logic)
**Gate:** full (`bun test:integration && bun test:e2e`)
**Commit:** `feat(api): add MemberConnectorIdentityRepository`

---

### T6: Extend `LeadRepository` + `LeadJourneyRepository` for backfill

**What:** Add `LeadRepository.backfillOwnerUserId(tx, connectorAccountId, externalId, userId): Promise<{ updated: number }>` and `LeadJourneyRepository.resumeErrorStateByLeadsAndReason(tx, leadIds, reason, nextTouchAt): Promise<{ updated: number }>`. Integration tests assert the UPDATE WHERE clauses produce the right set.

**Where:**
- `apps/api/src/modules/engine/persistence/lead.repository.ts` (modify)
- `apps/api/src/modules/engine/persistence/lead-journey.repository.ts` (modify)
- `apps/api/src/modules/engine/persistence/__test__/integration/lead-owner-backfill.repository.spec.ts` (new)

**Depends on:** T4 (`errorReason` column projected)
**Reuses:** Existing `reassign` / `resumePausedForOwner` patterns
**Requirement:** `OWNER-11`, `OWNER-12`.

**Done when:**
- [ ] `backfillOwnerUserId` updates only `(accountId, externalId, ownerUserId IS NULL)` rows; returns count
- [ ] `resumeErrorStateByLeadsAndReason` updates only `(status='error_state', errorReason=reason, leadId IN (...))` rows; sets `status='running'`, `errorReason=NULL`, `nextTouchAt=<arg>`
- [ ] Both accept `tx: DbTransaction` (use cases compose with mapping create in one tx)
- [ ] Integration spec asserts: no rows touched when `ownerUserId` is already non-null; no rows touched when reason mismatches; correct rows updated when both match; transactional rollback works (if tx throws, no rows persisted)
- [ ] Gate check passes: `bun test:integration`

**Verify:** New integration spec green; existing `lead.repository.spec` (if any) still green.

**Tests:** integration
**Gate:** full
**Commit:** `feat(api): add lead owner backfill + journey resume repository methods`

---

### T7: `UserRepository.findVerifiedActiveByEmail`

**What:** Add a read method on the identity-module `UserRepository` that joins `users` + `memberships` and returns a `{ userId, membershipId } | undefined` for a verified-active member matching a lowercased email in a given workspace.

**Where:**
- `apps/api/src/modules/identity/persistence/user.repository.ts` (modify)
- `apps/api/src/modules/identity/persistence/__test__/integration/user.repository.spec.ts` (modify or new)

**Depends on:** None (uses existing schemas)
**Reuses:** Existing `UserRepository` infra; `users.email`/`emailVerifiedAt`; `memberships.workspaceId`/`status`
**Requirement:** `OWNER-03`, `OWNER-05`.

**Done when:**
- [ ] Method signature `findVerifiedActiveByEmail(workspaceId: string, lowercaseEmail: string): Promise<{ userId: string; membershipId: string } | undefined>`
- [ ] SQL: `INNER JOIN memberships ON memberships.userId = users.id` with `eq(users.email, lowercaseEmail)`, `isNotNull(users.emailVerifiedAt)`, `eq(memberships.workspaceId, workspaceId)`, `eq(memberships.status, 'active')`, `.limit(1)`
- [ ] Integration spec: returns undefined for non-matching email; returns undefined when emailVerifiedAt IS NULL; returns undefined when membership is inactive; returns row when all conditions met
- [ ] Gate check passes: `bun test:integration`

**Verify:** Spec green.

**Tests:** integration
**Gate:** full
**Commit:** `feat(api): add UserRepository.findVerifiedActiveByEmail`

---

### T8: `PipedriveApi.fetchOwner` + `PipedriveConnector.fetchOwner` + unit tests

**What:** Implement the `fetchOwner` port method on the Pipedrive connector. Adds `fetchOwner` to `PipedriveApi` (calls `GET /v1/users/{id}` via the existing `request` helper) and wires it through `PipedriveConnector`. Unit tests against an injected `fetchFn` (no network) cover happy path, missing email, 404 (returns `null`), 5xx (throws `CrmRequestFailedException`).

**Where:**
- `apps/api/src/modules/crm/plugins/pipedrive/pipedrive-api.ts` (modify)
- `apps/api/src/modules/crm/plugins/pipedrive/pipedrive.connector.ts` (modify)
- `apps/api/src/modules/crm/plugins/pipedrive/__test__/unit/pipedrive-api.spec.ts` (modify or new)

**Depends on:** T1 (`NormalizedOwner`), T3 (port method)
**Reuses:** `PipedriveApi.request` private helper; `pipedriveCredentialsSchema.parse`
**Requirement:** `OWNER-01` (Pipedrive implementation of the optional contract).

**Done when:**
- [ ] `PipedriveApi.fetchOwner(externalId, credentials): Promise<NormalizedOwner | null>` calls `GET /users/{externalId}` via `request`
- [ ] Returns `{ externalId, name: data.name ?? '', email: data.email ?? null }` from the Pipedrive payload
- [ ] Returns `null` when Pipedrive responds 404 (catch `CrmRequestFailedException` whose message includes `-> 404`) OR when `data` is missing; rethrows other errors
- [ ] `PipedriveConnector.fetchOwner` delegates to `this.api.fetchOwner(externalId, parsedCredentials)`
- [ ] Unit spec via `generate-tests` covers all four branches (200 with email, 200 without email, 404 → null, 500 → throws)
- [ ] Gate check passes: `bun test:unit`

**Verify:** `bun test:unit` green; new spec's request-shape assertions match `/users/<id>?api_token=...`.

**Tests:** unit (per TESTING.md matrix — fat with branches + HTTP shape assertions)
**Gate:** quick
**Commit:** `feat(api): PipedriveApi.fetchOwner + connector wiring`

---

### T9: Pipedrive connector module wiring + manifest sanity

**What:** Verify the `PipedriveConnector` registration in `CrmConnectorRegistry` doesn't need changes (it shouldn't — port is opaque), and confirm the `meta.connectorId` references stay correct. This task exists to catch wiring drift; expected to be a no-op file-touch if registration is already through `CRM_CONNECTORS` token. Combine into T8's commit if no changes are needed; else create a separate fix.

**Where:**
- `apps/api/src/modules/crm/crm.module.ts` (read; modify only if needed)

**Depends on:** T8
**Reuses:** Existing module wiring
**Requirement:** `OWNER-01` (operational).

**Done when:**
- [ ] `CrmConnectorRegistry.get('pipedrive').fetchOwner` is callable (verify via a one-line scratch read of the module's providers list)
- [ ] No changes needed OR a minimal wiring adjustment with rationale
- [ ] Gate check passes: `bun typecheck`

**Verify:** Read confirms no changes. If changes needed, document why.

**Tests:** none (covered by T8 + T11 + T15)
**Gate:** build

---

### T10: `ResolveOwnerService` + unit tests

**What:** Implement the cache-then-fetch-then-match-then-persist seam ingestion uses. Pure orchestration over `MemberConnectorIdentityRepository.findByExternal`, `CrmConnectorRegistry.get(...).fetchOwner?`, and `UserRepository.findVerifiedActiveByEmail`. Unit tests cover every branch via in-memory fakes.

**Where:**
- `apps/api/src/modules/crm/core/services/resolve-owner.service.ts` (new)
- `apps/api/src/modules/crm/core/services/__test__/unit/resolve-owner.service.spec.ts` (new)

**Depends on:** T1, T3, T5, T7, T8
**Reuses:** `CrmConnectorRegistry.get(connectorId)`; the three repository methods
**Requirement:** `OWNER-01`, `OWNER-02`, `OWNER-03`, `OWNER-05`.

**Done when:**
- [ ] Class with `resolve({ workspaceId, connectorAccountId, connectorId, credentials, ownerExternalId }): Promise<ResolveOwnerOutput>` where `ResolveOwnerOutput` is `{ userId: string } | { userId: null, errorReason: 'owner_not_mapped' | 'owner_lookup_failed' }`
- [ ] Branches: mapping exists → return userId; no mapping, fetchOwner null → owner_not_mapped; no mapping, fetchOwner returns no email → owner_not_mapped; no mapping, fetchOwner returns unmatched email → owner_not_mapped; no mapping, fetchOwner returns matched email → INSERT mapping (createdBy='auto:email', sourceEmail=<email>) and return userId; fetchOwner throws → owner_lookup_failed
- [ ] Connector without `fetchOwner` method → owner_not_mapped (defensive)
- [ ] Email comparison case-insensitive (lowercase pipedrive email before lookup)
- [ ] Unit spec via `generate-tests` — one branch per test, in-memory fakes for the three repos and the connector
- [ ] Gate check passes: `bun test:unit`

**Verify:** Spec green; branches exhaustively covered.

**Tests:** unit (fat — branches + email match + persistence side-effect)
**Gate:** quick
**Commit:** `feat(api): ResolveOwnerService for owner auto-match`

---

### T11: `LeadOwnerBackfillService` + integration tests

**What:** Implement the post-mapping-create backfill orchestration. Reads matching leads, updates their `ownerUserId`, resumes journeys parked on those leads with `errorReason='owner_not_mapped'`. Caller controls the transaction boundary; the service composes the two repository calls.

**Where:**
- `apps/api/src/modules/crm/core/services/lead-owner-backfill.service.ts` (new)
- `apps/api/src/modules/crm/core/services/__test__/integration/lead-owner-backfill.service.spec.ts` (new)

**Depends on:** T6
**Reuses:** `LeadRepository.backfillOwnerUserId`, `LeadJourneyRepository.resumeErrorStateByLeadsAndReason`, `Clock`
**Requirement:** `OWNER-11`, `OWNER-12`.

**Done when:**
- [ ] `backfillFor(tx, { connectorAccountId, externalId, userId }): Promise<{ leadsUpdated, journeysResumed }>` runs two writes against the provided `tx`
- [ ] Integration spec: with one lead + one parked journey → both updated; with one lead but no parked journey → only lead updated; with no leads → no-op return `{ 0, 0 }`; with a journey whose reason is NOT `owner_not_mapped` → journey untouched
- [ ] Gate check passes: `bun test:integration`

**Verify:** Spec green.

**Tests:** integration (fat — touches real Postgres for cross-table coordination)
**Gate:** full
**Commit:** `feat(api): LeadOwnerBackfillService`

---

### T12: Member-identity use cases (Create/Update/Delete/List) + unit + integration tests

**What:** Four use cases (one file each per code-standards §11) plus the conflict exception. Create/Update wrap the mapping write + `LeadOwnerBackfillService.backfillFor` in `db.transaction(async tx => ...)`. Delete is single-statement. List is a read-only join. Unit tests cover the use-case logic; integration test covers the end-to-end transactional behavior of Create (mapping inserted + leads backfilled + journeys resumed all-or-nothing).

**Where:**
- `apps/api/src/modules/crm/core/use-cases/create-member-connector-identity.use-case.ts` (new)
- `apps/api/src/modules/crm/core/use-cases/update-member-connector-identity.use-case.ts` (new)
- `apps/api/src/modules/crm/core/use-cases/delete-member-connector-identity.use-case.ts` (new)
- `apps/api/src/modules/crm/core/use-cases/list-member-connector-identities.use-case.ts` (new)
- `apps/api/src/modules/crm/core/errors/member-connector-identity.errors.ts` (new — `MemberConnectorIdentityConflictException`)
- `apps/api/src/modules/crm/core/use-cases/__test__/unit/create-member-connector-identity.use-case.spec.ts` (new)
- `apps/api/src/modules/crm/core/use-cases/__test__/integration/create-member-connector-identity.use-case.spec.ts` (new — tx behavior)

**Depends on:** T5, T7, T11
**Reuses:** `MemberConnectorIdentityRepository`, `LeadOwnerBackfillService`, `MembershipRepository.findByIdInWorkspace`, `ConnectorAccountRepository.findByIdInWorkspace`, `DrizzleService.db.transaction`
**Requirement:** `OWNER-09`, `OWNER-10`, `OWNER-11`, `OWNER-12`, `OWNER-13`, `OWNER-14`, `OWNER-17`.

**Done when:**
- [ ] Each use case is its own file with `@Injectable()` + a single `execute(input): Promise<...>`
- [ ] Create / Update: pre-validate `membershipId` belongs to workspace + `connectorAccountId` belongs to workspace; conflict check via `findByExternal` (account, externalId) BEFORE insert; on insert collision throw `MemberConnectorIdentityConflictException`; wrap insert + backfill in one transaction; `createdBy='admin:<userId>'`
- [ ] Delete: validates workspace ownership; returns `{ deleted: false }` if not found (controller maps to 404)
- [ ] List: returns the join shape
- [ ] Unit spec covers create branches (conflict, valid, transaction commit)
- [ ] Integration spec covers atomicity (transaction rollback if backfill fails)
- [ ] `MemberConnectorIdentityConflictException` extends the project's `BusinessRuleException` with code `owner.mapping-conflict`
- [ ] Gate check passes: `bun test:unit && bun test:integration`

**Verify:** Both specs green; conflict path produces 422 in downstream e2e.

**Tests:** unit + integration (fat — branches AND transactional behavior)
**Gate:** full
**Commit:** `feat(api): member-connector-identity use cases (create/update/delete/list)`

---

### T13: Wire `ResolveOwnerService` into `StartJourneyUseCase` + unit + integration tests

**What:** The ingestion seam change. `StartJourneyUseCase.upsertLead` now calls `ResolveOwnerService.resolve(...)` and sets `lead.ownerUserId` to the resolved id (or null). `execute` then either creates the journey in `running` (resolution succeeded) OR creates in `running` then immediately transitions to `error_state` with the appropriate reason via `LeadJourneyRepository.setStatus(tx?, id, 'error_state', reason)`. Integration test covers both branches via a fake connector + real DB.

**Where:**
- `apps/api/src/modules/engine/core/use-cases/start-journey.use-case.ts` (modify)
- `apps/api/src/modules/engine/core/use-cases/__test__/unit/start-journey.use-case.spec.ts` (modify — extend existing spec)
- `apps/api/src/modules/engine/core/use-cases/__test__/integration/start-journey.use-case.spec.ts` (new or modify)
- `apps/api/src/modules/engine/persistence/lead.repository.ts` (modify — extend `upsert` to accept `ownerUserId` so a single INSERT carries the new value)

**Depends on:** T10, T6 (errorReason), T2 (column)
**Reuses:** `StartJourneyUseCase` shape; `LeadJourneyRepository.setStatus` (T4 extension)
**Requirement:** `OWNER-04`, `OWNER-06`, `OWNER-07`, `OWNER-08`.

**Done when:**
- [ ] `LeadRepository.upsert` accepts `ownerUserId: string | null` and writes it on insert AND on conflict update (so a known-owner on re-entry refreshes the mapping)
- [ ] `StartJourneyUseCase.upsertLead` calls `ResolveOwnerService.resolve` between `connector.fetchLead` and `leads.upsert`; passes the resolved `ownerUserId` to upsert
- [ ] When resolution returns `{ userId: null, errorReason }`, the use case creates the journey and **immediately** calls `setStatus(undefined, journeyId, 'error_state', errorReason)` (no transaction needed — single write, eventually-consistent fine for first ingest)
- [ ] When `event.ownerExternalId` is null (Pipedrive deal has no owner), skip ResolveOwnerService entirely and proceed with `ownerUserId=null` + immediately park journey with reason `owner_not_mapped`
- [ ] Existing `start-journey.use-case.spec.ts` extended: new branches for each resolution outcome
- [ ] Integration spec via `generate-tests`: end-to-end with a fake connector against real DB validates the full ingest → journey-state flow
- [ ] Gate check passes: `bun test:unit && bun test:integration`

**Verify:** Both specs green; manual trace of an unowned deal lands in `error_state` reason `owner_not_mapped` with `ownerUserId=null`.

**Tests:** unit (use case branches) + integration (ingestion end-to-end)
**Gate:** full
**Commit:** `feat(api): wire ResolveOwnerService into ingestion`

---

### T14: Contracts in `@kizunu/api-contracts/crm`

**What:** Add the schemas + `Routes` entries for the new endpoints. Mirrors the existing connector-accounts contract structure.

**Where:**
- `packages/api-contracts/src/crm/member-connector-identity.contract.ts` (new)
- `packages/api-contracts/src/crm/index.ts` (modify — export)
- `packages/api-contracts/src/routes/index.ts` (modify — add `Routes.crm.identities.*`)

**Depends on:** None (independent contract package)
**Reuses:** existing zod v4 patterns (top-level `z.email()`, `z.uuid()`, `z.iso.datetime()`)
**Requirement:** `OWNER-09`, `OWNER-10`, `OWNER-13`, `OWNER-14`.

**Done when:**
- [ ] All five schemas per design.md Data Models section: `MemberConnectorIdentitySchema`, `CreateMemberConnectorIdentityRequestSchema`, `UpdateMemberConnectorIdentityRequestSchema`, `ListMemberConnectorIdentitiesResponseSchema`, `DeleteMemberConnectorIdentityResponseSchema` (`{ deleted: boolean }`)
- [ ] `Routes.crm.identities.{list,create,update,remove}` entries (function form for parameterized paths)
- [ ] zod v4 top-level formats only (`bun scripts/check-zod-v4.ts` passes)
- [ ] Gate check passes: `bun typecheck`

**Verify:** `bun typecheck` clean; the schemas import in the API and the client without drift.

**Tests:** none (declarative; behavior validated through downstream e2e)
**Gate:** build

---

### T15: HTTP controller + DTOs + e2e tests

**What:** Implement the `MemberConnectorIdentityController` with the four endpoints. Each handler resolves the workspace guard + the matching use case. DTOs come from `createZodDto` over the contract schemas. e2e test (supertest) covers each endpoint's happy path + the conflict 422 + the cascade-on-membership-delete invariant.

**Where:**
- `apps/api/src/modules/crm/http/controllers/member-connector-identity.controller.ts` (new)
- `apps/api/src/modules/crm/crm.module.ts` (modify — register controller + new use cases + service)
- `apps/api/src/modules/crm/http/dto/member-connector-identity.dto.ts` (new — `createZodDto` wrappers)
- `apps/api/src/modules/crm/__test__/e2e/member-connector-identity.e2e.spec.ts` (new)

**Depends on:** T12, T14
**Reuses:** Workspace-membership guard pattern (from `connector-accounts.controller.ts`); `ZodValidationPipe`; `ApplicationExceptionFilter`
**Requirement:** `OWNER-09`, `OWNER-10`, `OWNER-13`, `OWNER-14`.

**Done when:**
- [ ] Four endpoints registered at the exact paths in `Routes.crm.identities.*`
- [ ] DTOs from `createZodDto` so the global `ZodValidationPipe` runs
- [ ] e2e spec covers: 200/201 on each happy path; 422 `owner.mapping-conflict` on duplicate; 404 on missing id; 401 when unauthenticated; 403 when authenticated user is not a member of the workspace
- [ ] After membership FK cascade: deleting a member purges their mappings (integration spec already verifies; e2e re-verifies via the HTTP flow)
- [ ] Gate check passes: `bun test:e2e`

**Verify:** `bun test:e2e` green; the spec produces the expected status codes and error envelope shapes.

**Tests:** e2e (thin HTTP edge per TESTING.md matrix — single test type covers controller + guards + pipe)
**Gate:** full
**Commit:** `feat(api): MemberConnectorIdentity HTTP edge + e2e`

---

### T16: Update dispatcher error path to use `LeadJourneyErrorReason.NoChannel`

**What:** The existing dispatcher (feature 009) transitions to `error_state` when channel resolution fails. Update that path to also write `errorReason='no_channel'` via the new `setStatus(tx, id, 'error_state', errorReason)` signature. Pure migration — same behavior + a recorded reason. Existing dispatcher integration tests (if any) extended.

**Where:**
- `apps/api/src/modules/engine/core/services/journey-dispatcher.ts` (modify — find the `error_state` transition for missing channel)
- `apps/api/src/modules/engine/core/services/__test__/integration/journey-dispatcher.spec.ts` (modify — assert `errorReason` is set)

**Depends on:** T4
**Reuses:** Existing dispatcher flow; existing transition helpers
**Requirement:** Spec OWNER-08 (sibling reason `no_channel`); covered for completeness/consistency.

**Done when:**
- [ ] Dispatcher's "no channel" branch passes `LeadJourneyErrorReason.NoChannel` to `setStatus`
- [ ] Any other existing error transitions (e.g., template-required) similarly wire their reasons through the const object (defer template-required wiring to feature `048`; for now only `no_channel` is in scope)
- [ ] Existing dispatcher spec assertions on `errorReason` added/updated
- [ ] Gate check passes: `bun test:integration`

**Verify:** `bun test:integration` green; the dispatcher's `error_state` rows now carry the reason.

**Tests:** integration (existing dispatcher spec extended)
**Gate:** full
**Commit:** `feat(api): wire LeadJourneyErrorReason.NoChannel into dispatcher`

---

### T17: API client + web admin UI (per-account identities tab)

**What:** Add the api-client layer and the web admin surface per ADR-007 + web-patterns.md §1 + §3 + §6. Per-feature folder under the existing `_app/settings/connectors/` route tree; trigger-button → `ResourceDialog` with a `react-hook-form + zod` dumb form per §3.

**Where:**
- `packages/api-client/src/crm/member-connector-identity.api.ts` (new — pure fetch wrappers)
- `packages/api-client/src/crm/use-member-connector-identities.ts` (new — query hook)
- `packages/api-client/src/crm/use-create-member-connector-identity.ts` (new — mutation, returns `{ createMemberConnectorIdentity: mutate, ... }`)
- `packages/api-client/src/crm/use-update-member-connector-identity.ts` (new)
- `packages/api-client/src/crm/use-delete-member-connector-identity.ts` (new)
- `packages/api-client/src/query-keys.ts` (modify — add `memberConnectorIdentities`)
- `apps/web/src/routes/_app/settings/connectors/$accountId/identities/index.tsx` (new — route + page)
- `apps/web/src/routes/_app/settings/connectors/$accountId/identities/-components/member-identities-table.tsx` (new)
- `apps/web/src/routes/_app/settings/connectors/$accountId/identities/-components/member-identity-form.tsx` (new — dumb form)
- `apps/web/src/routes/_app/settings/connectors/$accountId/identities/-dialogs/create-member-identity-dialog.tsx` (new)
- `apps/web/src/routes/_app/settings/connectors/$accountId/identities/-dialogs/edit-member-identity-dialog.tsx` (new)
- `apps/web/src/routes/_app/settings/connectors/$accountId/identities/-dialogs/delete-member-identity-dialog.tsx` (new)
- `apps/web/src/routes/_app/settings/connectors/$accountId/identities/-utils/columns.tsx` (new)
- `apps/web/src/routes/_app/settings/connectors/$accountId/identities/__test__/member-identity-form.spec.tsx` (new — web unit spec on the form's validation)
- `apps/web/src/_shell/app-shell/data/` (modify if the connectors area needs a sub-nav addition; likely a tab inside the existing connector-detail page)

**Depends on:** T14, T15
**Reuses:** `ResourceDialog`, `DeleteResourceDialog`, `DataTable`, `PageHeader`, `FormError`, `useMutationDialog`, `RhfField`, `LookupSelect` (for the member dropdown), `getApiErrorMessage`
**Requirement:** `OWNER-09`, `OWNER-10`, `OWNER-13`, `OWNER-14`.

**Done when:**
- [ ] All api-client files follow ADR-007 §8: mutation hooks return `{ <domainName>: mutate, ...rest }` with hook-owned `queryClient.invalidateQueries`
- [ ] Web route is per-feature folder (web-patterns §1) with its own `-components/`, `-dialogs/`, `-utils/` siblings; no flat-file feature-routes
- [ ] Form uses `useForm({ resolver: zodResolver(CreateMemberConnectorIdentityRequestSchema) })` per web-patterns §3.a / §3.b (LookupSelect uses `<Controller>`); no per-field `useState`
- [ ] Two error surfaces (web-patterns §3): field-level `<FieldError>` via `aria-invalid` + `aria-describedby`; top-of-form `<FormError>` for server errors
- [ ] Dialog wrappers use `useMutationDialog` (web-patterns §6); each ~25 lines
- [ ] `DataTable` row dropdown has Edit + Delete using the destructive-variant pattern (per-row `DotsThree` `ghost icon-sm` trigger)
- [ ] Empty-state copy: "No member identities yet" vs. "No matches" handled via the URL hook's `hasActiveSearch` (if filter ships) or static (no filter is needed at pilot scale; add only if T17 audit shows we want one)
- [ ] Web unit spec covers the form's field-required validation
- [ ] Gate check passes: `bunx vp test --project web --run` + `bun typecheck` + `CI=1 bunx vp lint`

**Verify:** `bun check` green from the root; the new route renders empty-state correctly when there are no identities.

**Tests:** web (fat form-validation logic), e2e covers the HTTP edge (T15)
**Gate:** full
**Commit:** `feat(web): member-identity admin UI under settings/connectors`

---

### T18: Verify dev-server actually renders the new screen (manual smoke via `run` skill)

**What:** Boot the dev server (or use the existing `bun dev`), open `/settings/connectors/<accountId>/identities`, create + edit + delete a mapping end-to-end; verify auto-resume behavior by simulating an unmapped deal then creating the mapping. This catches Chrome-only regressions that `bun check` can't (cf. the cmdk `Command`-root regression in PR #66, memory `cmdk-needs-command-root`).

**Where:** dev environment; no code change unless smoke surfaces a bug — in which case the bug-fix commit is part of T18.

**Depends on:** T17 (web shipped)
**Reuses:** `run` skill (boot the app); `claude-in-chrome` MCP for visual verification if needed
**Requirement:** All P1 stories end-to-end.

**Done when:**
- [ ] App boots without console errors on the new route
- [ ] Empty-state render correct; opening the create dialog renders the form
- [ ] Submit creates an identity; table reflects it; success toast fires
- [ ] Edit + delete dialogs work; conflict scenarios produce a `<FormError>` (not a toast)
- [ ] No regressions on adjacent routes (`/settings/connectors`, `/settings/connectors/new`)

**Verify:** Manual smoke; capture a short gif via `gif_creator` if visual feedback helps. If any bug found, fix it in this task and re-run.

**Tests:** none (manual smoke; automated coverage in T15 + T17)
**Gate:** build (no new code unless bug-fix)

---

### T19: P2 — Surface BDR's own mappings in `GET /auth/me`

**What:** Extend the `/auth/me` response with `connectorIdentities: ConnectorIdentitySummary[]`. Identity module imports the `MemberConnectorIdentityRepository.listForUser`. Web: a small profile-screen addition listing the BDR's identities (read-only — no edit; admin owns mutations).

**Where:**
- `packages/api-contracts/src/identity/me.contract.ts` (modify — extend response schema)
- `apps/api/src/modules/identity/core/use-cases/get-current-user.use-case.ts` (or wherever `/auth/me` lives — modify)
- `apps/api/src/modules/identity/identity.module.ts` (modify — import `CrmModule` exports if needed)
- `apps/api/src/__test__/e2e/me-flow.spec.ts` (modify — add identities case)
- `apps/web/src/routes/_app/settings/profile/-components/connector-identities-card.tsx` (new — small read-only card)
- `apps/web/src/routes/_app/settings/profile/index.tsx` (modify — include the card)

**Depends on:** T5, T17 (path conventions established)
**Reuses:** Existing `me` controller + use case; `Card` primitive
**Requirement:** `OWNER-16`.

**Done when:**
- [ ] `MeResponseSchema` gains `connectorIdentities: z.array(ConnectorIdentitySummarySchema).default([])`
- [ ] Use case populates the field
- [ ] No cycle introduced — identity module imports from `CrmModule.exports` (CrmModule does not import IdentityModule, verified)
- [ ] e2e covers: BDR with no mappings → `[]`; BDR with one mapping → the mapping
- [ ] Web card renders empty-state when no identities, list when populated
- [ ] Gate check passes: `bun check` (full)

**Verify:** `bun check` green; `/auth/me` returns the new field; the web card displays.

**Tests:** e2e (HTTP contract change), web (read-only card → none, covered by e2e)
**Gate:** full
**Commit:** `feat(api,web): expose BDR connector identities in /auth/me`

---

### T20: Documentation close-out — STATE, CONCERNS, ROADMAP

**What:** Reflect the completed feature in persistent docs. STATE.md gains a lesson entry; CONCERNS.md marks the High item's owner-mapping sub-bullet as resolved (in the same `_(Resolved)_` style used for prior items); ROADMAP.md flips `047` to `COMPLETE`.

**Where:**
- `.specs/project/STATE.md` (modify — add a lesson under `## Lessons`)
- `.specs/codebase/CONCERNS.md` (modify — resolve the owner-mapping sub-bullet)
- `.specs/project/ROADMAP.md` (modify — `047` → COMPLETE)
- `.specs/features/047-crm-owner-mapping/spec.md` (modify — mark requirement status `Verified` on each ID)
- `.specs/features/047-crm-owner-mapping/tasks.md` (modify — mark all tasks Done)

**Depends on:** T19 (or the last shipping task)
**Reuses:** Existing doc patterns
**Requirement:** AGENTS.md Definition of Done #6 ("Docs updated").

**Done when:**
- [ ] STATE.md `## Lessons` has a new entry summarizing the 047 architecture (mapping aggregate + ResolveOwnerService + LeadOwnerBackfillService + errorReason column) — same prose style as prior lessons
- [ ] CONCERNS.md's "Dispatcher gaps" High entry has a `_(Resolved — owner mapping)_` sub-note linking to 047 (the other two sub-items stay open for 048 + 049)
- [ ] ROADMAP.md Phase 2.0 marks `047` COMPLETE with a one-paragraph summary
- [ ] spec.md traceability table updated to `Verified`
- [ ] tasks.md `Status: Done`; checkboxes ticked
- [ ] Gate check passes: `bun check` (no code change → quick run)

**Verify:** `git diff` shows only doc updates; no test regressions.

**Tests:** none
**Gate:** build
**Commit:** `docs: close out 047 (state, concerns, roadmap, traceability)`

---

## Parallel Execution Map

```
Phase 1 — Foundation:
  T1 → T2 → T3
        └→ T4 (depends T2)

Phase 2 — Persistence (some [P] possible):
  After T4:
    T5 [P]  (new repo, no shared writes with T6/T7)
    T6 [P]  (extends two repos, but tests use disjoint tables from T5)
    T7 [P]  (different module entirely)
  After T1+T3:
    T8 → T9
  (Caveat: integration/e2e tests are NOT parallel-safe per TESTING.md
   Parallelism Assessment — the [P] flag here applies to AGENT execution,
   not test run order. Tests still serialize via the existing
   fileParallelism:false setting.)

Phase 3 — Services & ingestion:
  After T5,T7,T8: T10
  After T6: T11
  After T5,T11: T12
  After T10,T6,T2: T13

Phase 4 — HTTP:
  T14 (no deps) [P] with most of Phase 2
  After T12,T14: T15
  After T4: T16 (can land any time after T4)

Phase 5 — Web:
  After T14,T15: T17 → T18

Phase 6 — P2 self-visibility:
  After T17: T19

Phase 7 — Docs:
  After T19: T20
```

**For autonomous execution, run sequentially T1→T20.** Parallel sub-agents
add coordination cost that outweighs the gain on a single-feature PR; the
parallelism map above is informational for human reviewers planning a
multi-developer day.

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1 | 3 domain type files | OK (cohesive — all enum/type primitives, no logic) |
| T2 | 1 new schema + 1 column + 1 migration | OK (single migration = single drizzle generation) |
| T3 | 1 port method addition | Granular |
| T4 | 2 repository method signatures | OK (one repository, two cohesive method changes) |
| T5 | 1 repository + tests | Granular |
| T6 | 2 repository method additions + tests | OK (cross-repo backfill needs co-located tests) |
| T7 | 1 repository method + tests | Granular |
| T8 | 1 API + 1 connector + tests | OK (port impl is cohesive with its delegate) |
| T9 | wiring sanity (no-op likely) | Granular |
| T10 | 1 service + unit tests | Granular |
| T11 | 1 service + integration tests | Granular |
| T12 | 4 use cases + exception + tests | Borderline — 4 use cases is the natural cohesion (same CRUD aggregate); resists premature split |
| T13 | 1 use-case modify + lead-repo extension + tests | OK (single ingestion seam — extension belongs together) |
| T14 | 1 contract file + Routes | Granular |
| T15 | 1 controller + module wiring + DTOs + e2e | OK (HTTP edge unit, all coupled) |
| T16 | dispatcher errorReason wiring | Granular |
| T17 | api-client + web route + form + dialogs + table | Borderline — the per-feature folder is one cohesive unit per web-patterns §1 + §10 |
| T18 | smoke verify | Granular |
| T19 | /auth/me extension + web card | OK (single feature: surface BDR's own data) |
| T20 | doc close-out | Granular |

**Borderline ones (T12, T17):** kept cohesive because they map to a single
slice of the spec — splitting them would force test setup duplication
(use-case fakes in T12; route-folder primitives in T17) without buying
parallelism.

---

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | None | OK |
| T2 | T1 | T1 → T2 | OK |
| T3 | T1 | T1 → T3 | OK |
| T4 | T2 | T2 → T4 | OK |
| T5 | T2, T1 | (Phase 2 after T4) | OK |
| T6 | T4 | (Phase 2 after T4) | OK |
| T7 | None | (Phase 2 parallel) | OK |
| T8 | T1, T3 | T3 → T8 | OK |
| T9 | T8 | T8 → T9 | OK |
| T10 | T1, T3, T5, T7, T8 | (Phase 3, T5+T7+T8 → T10) | OK |
| T11 | T6 | (Phase 3, T6 → T11) | OK |
| T12 | T5, T7, T11 | (Phase 3, T5+T11 → T12) | OK |
| T13 | T10, T6, T2 | (Phase 3, T10+T6 → T13) | OK |
| T14 | None | (Phase 4, parallel) | OK |
| T15 | T12, T14 | T12+T14 → T15 | OK |
| T16 | T4 | (Phase 4) | OK |
| T17 | T14, T15 | T15 → T17 | OK |
| T18 | T17 | T17 → T18 | OK |
| T19 | T5, T17 | T17 → T19 | OK |
| T20 | T19 | T19 → T20 | OK |

All ✅ Match.

---

## Test Co-location Validation

| Task | Code Layer | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | Domain types (pure declarations) | none | none | OK |
| T2 | Schema | compile-time (`Assert<Equal>`) — N/A here, no enum | none | OK |
| T3 | Port (interface change) | none (validated through impl) | none | OK |
| T4 | Repository method signature only | none (no SQL behavior change in T4) | none | OK |
| T5 | Repository with non-trivial queries | integration | integration | OK |
| T6 | Repository with UPDATE WHERE behavior | integration | integration | OK |
| T7 | Repository with JOIN + filters | integration | integration | OK |
| T8 | Connector (HTTP wrapper, branch logic, "fat") | unit | unit | OK |
| T9 | Module wiring (no behavior) | none | none | OK |
| T10 | Use-case-shaped service (branches → fat) | unit | unit | OK |
| T11 | Service over real tx (fat orchestration over real DB) | integration | integration | OK |
| T12 | Use cases (fat — conflict + tx) | unit + integration | unit + integration | OK |
| T13 | Use case with ingestion branches (fat) + repo extension | unit + integration | unit + integration | OK |
| T14 | Contract (declarative) | none | none | OK |
| T15 | HTTP controller + DTO + guard | e2e | e2e | OK |
| T16 | Existing dispatcher modification (fat) | integration (extends existing) | integration | OK |
| T17 | Web form (fat validation), thin route | web | web | OK |
| T18 | Manual smoke | none | none | OK |
| T19 | `/auth/me` response field + read | e2e | e2e | OK |
| T20 | Docs | none | none | OK |

All ✅ OK. No `Tests: none` claims on code layers requiring tests.

---

## MCPs and Skills per Task

| Task | MCPs | Skills |
| --- | --- | --- |
| T1 | codegraph (lookups) | none |
| T2 | codegraph | none (Bash for `bun db:generate`) |
| T3 | codegraph | none |
| T4 | codegraph | none |
| T5–T7 | codegraph | `generate-tests` (test authoring) |
| T8 | codegraph | `generate-tests` |
| T9 | codegraph | none |
| T10–T13 | codegraph | `generate-tests` |
| T14 | codegraph | none |
| T15 | codegraph | `generate-tests` |
| T16 | codegraph | `generate-tests` |
| T17 | codegraph, `claude-in-chrome` (visual verify if needed), `shadcn` (only if a new primitive is missing — likely not) | `generate-tests` (web spec) |
| T18 | `claude-in-chrome` | `run`, `verify` |
| T19 | codegraph | `generate-tests` |
| T20 | none | none |

**Branch-and-PR + ship:** at the end of T20, invoke `review-and-ship` for
the final PR (`new-branch-and-pr` is used at the START to create the branch,
before T1; `review-and-ship` is used at the END after the strict review).

**Strict review:** between T20 and ship, invoke
`thermo-nuclear-code-quality-review` on the branch diff per AGENTS.md flow.

**CI:** after ship, invoke `ci-watcher`; on red, `fix-ci`.
