# Feature 030 — Tasks

**Design**: `.specs/features/030-oauth-credential-primitives/design.md`
**Status**: Approved

---

## Execution Plan

### Phase 1: Shared primitives (Sequential)

The contract-layer additions and the encryption service.

```
T1 ──→ T2 ──→ T3 ──→ T4
```

### Phase 2: Persistence integration (Parallel after T4)

Both repositories adopt the encryption boundary independently.

```
        ┌──→ T5 ──┐
T4 ─────┤         ├──→ T7
        └──→ T6 ──┘
```

### Phase 3: Refresh contract + service (Sequential)

```
T7 ──→ T8 ──→ T9
```

### Phase 4: Config + docs (Sequential)

```
T9 ──→ T10 ──→ T11
```

---

## Task Breakdown

### T1: `oauthCredentialFields` zod mixin

**What**: Export a shared zod `ZodRawShape` mixin (`accessToken`, `refreshToken?`, `accessTokenExpiresAt?`) plus its inferred type, in a new `shared/` sub-dir of `api-contracts`.
**Where**: `packages/api-contracts/src/shared/oauth-credential-fields.ts` + `packages/api-contracts/src/shared/index.ts` + add a barrel export from `packages/api-contracts/src/index.ts` if one exists for shared.
**Depends on**: None
**Reuses**: `zod` (v4 top-level format helpers already in use across `api-contracts`).
**Requirement**: OAUTHPRIM-01, OAUTHPRIM-02, OAUTHPRIM-03

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `oauthCredentialFields` exported as `satisfies z.ZodRawShape`.
- [ ] `OAuthCredentialFields` type inferred from `z.object(oauthCredentialFields)`.
- [ ] Importable in `apps/api`.
- [ ] Gate check passes: `bun typecheck`

**Tests**: none — zod schema declaration; downstream consumers (T5/T8) test composition.
**Gate**: build

---

### T2: `EncryptedCredentialsEnvelope` type

**What**: One-type-per-file declaration of the on-disk envelope shape.
**Where**: `packages/nestjs-shared/src/modules/persistence/services/encrypted-credentials-envelope.ts`
**Depends on**: None
**Reuses**: nothing
**Requirement**: OAUTHPRIM-04

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `EncryptedCredentialsEnvelope` interface exported with the 5 documented fields.
- [ ] Gate check passes: `bun typecheck`

**Tests**: none — type declaration.
**Gate**: build

---

### T3: `CredentialsDecryptionFailedException`

**What**: `ApplicationException` subclass for `credentials.decryption-failed` (status 500, no context).
**Where**: `packages/nestjs-shared/src/lib/exceptions/credentials-decryption-failed.exception.ts`
**Depends on**: None
**Reuses**: existing `ApplicationException` base.
**Requirement**: OAUTHPRIM-08

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Subclass with constructor calling `super('credentials.decryption-failed', '…', 500)`.
- [ ] Gate check passes: `bun typecheck`

**Tests**: none — single constructor (covered by T4's tamper test).
**Gate**: build

---

### T4: `EncryptedCredentialsService` + co-located unit tests

**What**: Core AES-256-GCM service. Constructor pulls `credentials.encryptionKey` from `ConfigService<Config>`; `encrypt`, `decrypt`, `isEnvelope`. Legacy plaintext passthrough on decrypt; tamper detection throws T3's exception.
**Where**: `packages/nestjs-shared/src/modules/persistence/services/encrypted-credentials.service.ts` + `__test__/unit/encrypted-credentials.service.spec.ts`.
**Depends on**: T2, T3
**Reuses**: `node:crypto`, `ConfigService`.
**Requirement**: OAUTHPRIM-04, OAUTHPRIM-05, OAUTHPRIM-08, OAUTHPRIM-09

**Tools**:
- MCP: NONE
- Skill: `generate-tests`

**Done when**:
- [ ] `encrypt(value)` returns envelope; `decrypt(envelope)` returns the input value (round-trip).
- [ ] `decrypt(plaintextObject)` returns the plaintext unchanged (legacy).
- [ ] Tampering any of `iv` / `tag` / `data` makes `decrypt` throw `CredentialsDecryptionFailedException`.
- [ ] `encrypt(undefined)` throws.
- [ ] Key is read once from config at construction; service is `@Injectable`.
- [ ] Gate check passes: `bun test:unit`
- [ ] Test count: 6+ new tests (round-trip, plaintext-passthrough, tampered iv/tag/data, undefined input).

**Tests**: unit (fat — cryptographic round-trip + branching error paths).
**Gate**: quick

---

### T5: `ChannelAccountRepository` adopts encryption boundary [P with T6]

**What**: Every `credentials` write path encrypts; every read path that exposes `credentials` decrypts. Add `findNearExpiry(now, bufferMs)` returning rows that might be near expiry (post-decrypt JS filter) and `persistCredentials(id, credentials)` for the refresh service.
**Where**: `apps/api/src/modules/channel/persistence/channel-account.repository.ts` + add an integration spec at `apps/api/src/modules/channel/persistence/__test__/integration/channel-account.repository.spec.ts` (if not present — verify) covering encrypt-on-write + decrypt-on-read + legacy plaintext passthrough.
**Depends on**: T4
**Reuses**: `EncryptedCredentialsService`, existing Drizzle query patterns.
**Requirement**: OAUTHPRIM-04, OAUTHPRIM-05, OAUTHPRIM-06, OAUTHPRIM-09

**Tools**:
- MCP: NONE
- Skill: `generate-tests`

**Done when**:
- [ ] `create`, `findCredentials`, `findWorkspaceAndCredentials` route through encrypt/decrypt.
- [ ] `findNearExpiry(now, bufferMs)` exists and returns `Array<{ id, pluginId, credentials }>` filtered in JS.
- [ ] `persistCredentials(id, credentials)` exists and encrypts before UPDATE.
- [ ] `listByWorkspace` (which doesn't expose `credentials`) is unchanged.
- [ ] Integration spec asserts the on-disk shape is envelope JSON after a write; legacy plaintext rows are read transparently.
- [ ] Gate check passes: `bun test:integration`
- [ ] Test count: 4+ integration cases (write→envelope; envelope→plaintext on read; legacy plaintext→plaintext on read; tampered row → 500).

**Tests**: integration (the on-disk invariant is the point of the boundary).
**Gate**: full

---

### T6: `ConnectorAccountRepository` adopts encryption boundary [P with T5]

**What**: Mirror of T5 for CRM connector account credentials — `create`, `findById`, `findByConnectorInWorkspace` encrypt/decrypt. No refresh extension on this repo in 030 (deferred until the second OAuth CRM).
**Where**: `apps/api/src/modules/crm/persistence/connector-account.repository.ts` + extend the existing `__test__/integration/connector-account.repository.spec.ts` with envelope on-disk + plaintext passthrough cases.
**Depends on**: T4
**Reuses**: `EncryptedCredentialsService`.
**Requirement**: OAUTHPRIM-04, OAUTHPRIM-05, OAUTHPRIM-06, OAUTHPRIM-09

**Tools**:
- MCP: NONE
- Skill: `generate-tests`

**Done when**:
- [ ] `create`, `findById`, `findByConnectorInWorkspace` route through encrypt/decrypt.
- [ ] Integration spec asserts envelope-on-disk + plaintext-passthrough behavior.
- [ ] Gate check passes: `bun test:integration`
- [ ] Test count: 2+ integration cases here (cohesive with T5's; CRM repo is smaller surface).

**Tests**: integration.
**Gate**: full

---

### T7: Wire `EncryptedCredentialsService` into persistence module

**What**: The persistence module exports the service so `ChannelModule` and `CrmModule` can inject it via DI.
**Where**: `packages/nestjs-shared/src/modules/persistence/persistence.module.ts` (locate exact path — likely `index.ts` or a module file) + Channel/CRM module providers.
**Depends on**: T4, T5, T6
**Reuses**: existing Persistence module wiring.
**Requirement**: OAUTHPRIM-09

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `EncryptedCredentialsService` is provided + exported by the persistence module.
- [ ] Both repositories inject it cleanly (no constructor refactor surprise).
- [ ] Gate check passes: `bun typecheck` + `bun test:integration` + `bun test:e2e`
- [ ] No existing tests regress (full suite green).

**Tests**: none (wiring; covered by T5/T6 integration + e2e from earlier features).
**Gate**: full

---

### T8: `ChannelPlugin.refreshCredentials?` hook + input type

**What**: Add the optional hook to the port (`refreshCredentials?(input: RefreshCredentialsInput): Promise<unknown>`); declare `RefreshCredentialsInput` (`{ channelAccountId, credentials }`) in its own file (one-type-per-file).
**Where**: `apps/api/src/modules/channel/core/plugin/channel-plugin.ts` + new `refresh-credentials-input.ts`.
**Depends on**: T7
**Reuses**: the existing optional-hook pattern from 029's `onAccountCreated`.
**Requirement**: OAUTHPRIM-10

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Interface gains the optional method.
- [ ] `RefreshCredentialsInput` is its own file.
- [ ] Gate check passes: `bun typecheck`

**Tests**: none — interface declaration.
**Gate**: build

---

### T9: `OAuthRefreshService` + unit tests

**What**: `refreshDue()` queries `findNearExpiry`, groups by `pluginId`, calls `plugin.refreshCredentials` for hooks that exist, persists results. `start()`/`onModuleInit`/`onModuleDestroy` install/clear the `setInterval`; guard with `NODE_ENV !== 'test'`.
**Where**: `apps/api/src/modules/channel/core/services/oauth-refresh.service.ts` + `__test__/unit/oauth-refresh.service.spec.ts`.
**Depends on**: T5, T8
**Reuses**: existing `JourneyPoller` interval pattern; `ChannelAccountRepository.findNearExpiry` (T5).
**Requirement**: OAUTHPRIM-10, OAUTHPRIM-11, OAUTHPRIM-12, OAUTHPRIM-13, OAUTHPRIM-14

**Tools**:
- MCP: NONE
- Skill: `generate-tests`

**Done when**:
- [ ] `refreshDue()` finds near-expiry rows, calls each plugin's hook with the row's plaintext credentials, persists returned credentials.
- [ ] Rows whose plugin has no `refreshCredentials` are skipped.
- [ ] Hook throw is caught + logged + row unchanged; next call still finds and retries the row.
- [ ] `NODE_ENV=test` disables the interval (mirrors JourneyPoller).
- [ ] Gate check passes: `bun test:unit`
- [ ] Test count: 4+ tests (happy path, no-hook skipped, hook-throws-no-persist, retry-on-next-tick).

**Tests**: unit (fat — branching orchestration).
**Gate**: quick

---

### T10: Wire `OAuthRefreshService` into `ChannelModule`

**What**: Register the service as a provider; the persistence integration test in T5 covers the seam end-to-end already, so no new e2e here.
**Where**: `apps/api/src/modules/channel/channel.module.ts`.
**Depends on**: T9
**Reuses**: existing module providers list.
**Requirement**: OAUTHPRIM-10

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `OAuthRefreshService` is a `provider` of `ChannelModule`.
- [ ] Booting the API does not start the interval under `NODE_ENV=test`.
- [ ] Gate check passes: `bun check`

**Tests**: none (covered by T9 + full e2e).
**Gate**: build

---

### T11: Encryption-key config + env wiring + CONCERNS update

**What**: Add `credentials.encryptionKey` to `api.config.ts` (base64, min length to decode to 32 bytes); read from `APP_CREDENTIALS_ENCRYPTION_KEY`; surface in `apps/api/.env.example` and `deploy/docker-compose.yml` with a `# openssl rand -base64 32` comment. Mark the "Provider credentials are stored unencrypted" entry in `CONCERNS.md` as resolved (or move to "Resolved" sub-section if one exists).
**Where**: `apps/api/src/api.config.ts`, `apps/api/.env.example`, `deploy/docker-compose.yml`, `.specs/codebase/CONCERNS.md`.
**Depends on**: T7
**Reuses**: existing config schema pattern (zod `.min(N)` for base64 length).
**Requirement**: OAUTHPRIM-07, OAUTHPRIM-15, OAUTHPRIM-16, OAUTHPRIM-17

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `Config.credentials.encryptionKey: string`, required at runtime; missing/short value fails boot.
- [ ] `.env.example` shows the var with a generation comment.
- [ ] docker-compose passes the env through.
- [ ] CONCERNS entry marked resolved with a pointer to this feature.
- [ ] Gate check passes: `bun check`
- [ ] An e2e smoke test (existing health spec) still boots successfully with the new required var (the e2e setup provides a dev key).

**Tests**: none (config; covered indirectly by T4's tests once injection works).
**Gate**: build

---

## Parallel Execution Map

```
Phase 1 (Sequential):
  T1 ──→ T2 ──→ T3 ──→ T4

Phase 2 (Parallel after T4):
    ├── T5 [P]
    └── T6 [P]

Phase 3 (Sequential):
  T5 + T6 complete →
    T7 ──→ T8 ──→ T9

Phase 4 (Sequential):
  T9 →
    T10 ──→ T11
```

**Parallelism constraint:** T5 and T6 are integration tests that share the
same `kizunu_test` Postgres → integration project is NOT parallel-safe per
TESTING.md. They run sequentially within the integration project, but their
implementation code can be authored in parallel (independent files).

---

## Task Granularity Check

| Task                                  | Scope                                                    | Status      |
| ------------------------------------- | -------------------------------------------------------- | ----------- |
| T1: zod mixin                         | 1 file, additive                                         | ✅ Granular |
| T2: envelope type                     | 1 file, type declaration                                 | ✅ Granular |
| T3: exception class                   | 1 file, constructor only                                 | ✅ Granular |
| T4: encryption service + tests        | 1 file (+ 1 spec); cohesive crypto helper                | ✅ Granular |
| T5: channel repo refactor + integ test | 1 repo file (+ 1 spec); cohesive boundary                | ✅ Granular |
| T6: connector repo refactor + integ   | 1 repo file (+ 1 spec extension); mirror of T5           | ✅ Granular |
| T7: persistence module wiring         | 1 module file edit                                       | ✅ Granular |
| T8: port hook + input type            | 2 small files (one-type-per-file)                        | ✅ Granular |
| T9: refresh service + tests           | 1 file (+ 1 spec); cohesive scheduler                    | ✅ Granular |
| T10: channel module wiring            | 1 module file edit                                       | ✅ Granular |
| T11: config + docs                    | 4 files (config, env example, compose, CONCERNS)         | ✅ Granular (cohesive single change-set) |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body)        | Diagram Shows                | Status   |
| ---- | ----------------------------- | ---------------------------- | -------- |
| T1   | None                          | (root)                       | ✅ Match |
| T2   | None                          | T1 → T2 (legibility)         | ✅ Match (no semantic dep) |
| T3   | None                          | T2 → T3 (legibility)         | ✅ Match (no semantic dep) |
| T4   | T2, T3                        | T3 → T4                      | ✅ Match |
| T5   | T4                            | T4 → T5                      | ✅ Match |
| T6   | T4                            | T4 → T6                      | ✅ Match |
| T7   | T4, T5, T6                    | T5+T6 → T7                   | ✅ Match |
| T8   | T7                            | T7 → T8                      | ✅ Match |
| T9   | T5, T8                        | T8 → T9                      | ✅ Match (T5 implied via Phase 2 completion) |
| T10  | T9                            | T9 → T10                     | ✅ Match |
| T11  | T7                            | T10 → T11                    | ✅ Match (T7 implied; T10 ordering is for cohesion) |

---

## Test Co-location Validation

| Task | Code Layer Created/Modified                                | Matrix Requires           | Task Says     | Status |
| ---- | ---------------------------------------------------------- | ------------------------- | ------------- | ------ |
| T1   | Shared zod schema (declaration)                            | none (additive contract)  | none          | ✅ OK  |
| T2   | Shared type                                                | none                      | none          | ✅ OK  |
| T3   | Exception class (constructor)                              | none (thin glue)          | none          | ✅ OK  |
| T4   | Pure service (fat — crypto + branching)                    | unit                      | unit          | ✅ OK  |
| T5   | Repository (carries new query logic + boundary)            | integration               | integration   | ✅ OK  |
| T6   | Repository (same boundary)                                 | integration               | integration   | ✅ OK  |
| T7   | Module wiring                                              | none (covered by T5/T6)   | none          | ✅ OK  |
| T8   | Port interface (declaration)                               | none                      | none          | ✅ OK  |
| T9   | Service (fat — orchestration with branches)                | unit                      | unit          | ✅ OK  |
| T10  | Module wiring                                              | none (covered by T9)      | none          | ✅ OK  |
| T11  | Config schema + env files + docs                           | none                      | none          | ✅ OK  |

---

## Commit Plan

One commit per task, conventional commits (all `feat(api)` or `refactor(api)` per project scope-enum):

- T1: `feat(api): add oauthCredentialFields zod mixin in api-contracts/shared`
- T2: `feat(api): add EncryptedCredentialsEnvelope type`
- T3: `feat(api): add CredentialsDecryptionFailedException`
- T4: `feat(api): add EncryptedCredentialsService for at-rest credential encryption`
- T5: `feat(api): encrypt channel-account credentials at the repo boundary`
- T6: `feat(api): encrypt connector-account credentials at the repo boundary`
- T7: `feat(api): wire EncryptedCredentialsService into the persistence module`
- T8: `refactor(api): add optional refreshCredentials hook to ChannelPlugin port`
- T9: `feat(api): add OAuthRefreshService scheduler for near-expiry channel tokens`
- T10: `feat(api): register OAuthRefreshService in ChannelModule`
- T11: `feat(api): require APP_CREDENTIALS_ENCRYPTION_KEY and resolve CONCERNS entry`
