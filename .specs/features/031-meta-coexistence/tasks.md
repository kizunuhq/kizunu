# Feature 031 — Tasks

**Design**: `.specs/features/031-meta-coexistence/design.md`
**Status**: Approved

---

## Execution Plan

```
Phase 1: Schema + config + exceptions (Sequential)
  T1 ──→ T2 ──→ T3

Phase 2: Plugin internals (Sequential)
  T3 → T4 → T5 → T6

Phase 3: Connect endpoint + contract + web hook (Sequential)
  T6 → T7 → T8 → T9

Phase 4: Web page + docs (Sequential)
  T9 → T10 → T11
```

## Task Breakdown

### T1: Config additions + env wiring + exception classes

**What**: Add `meta.appId`, `meta.appSecret`, `meta.coexConfigId` to `api.config.ts` (defaults `''`); env vars + docker compose; new exception files `MetaCoexNotConfiguredException`, `MetaConnectFailedException`.
**Where**: `apps/api/src/api.config.ts`, `apps/api/.env.example`, `deploy/docker-compose.yml`, two new exception files under `meta-whatsapp/`.
**Depends on**: None
**Reuses**: existing config + ApplicationException patterns.
**Requirement**: COEX-01, COEX-06.
**Tests**: none (config + thin glue).
**Gate**: build.

### T2: `metaCredentialsSchema` discriminated union + drift guard

**What**: Replace the flat 6-field schema with `z.discriminatedUnion('channelMode', [cloudApi, coexistence])`. Update `metaCredentialsClientSchema` to be `cloudApi.omit({ verifyToken: true })`. Re-validate the drift guard (descriptor keys are now the cloud_api branch keys minus `verifyToken`; Coex has no operator-facing descriptor — Coex rows are constructed by the connect endpoint, not the form). Update the existing meta-credentials spec to cover both branches.
**Where**: `meta-credentials.ts` + `__test__/unit/meta-credentials.spec.ts` + `__test__/unit/meta-credential-fields.spec.ts`.
**Depends on**: T1.
**Reuses**: existing schema; `030`'s `oauthCredentialFields` mixin spread into the Coex branch.
**Requirement**: COEX-04, COEX-08.
**Tests**: unit.
**Gate**: quick.

### T3: `meta-coex-token.ts` (exchange + refresh helpers) + unit tests

**What**: `exchangeCodeForToken({ baseUrl, fetchFn, appId, appSecret, code })` and `exchangeForRefreshedToken({ ..., currentToken })`. Both return `{ accessToken, accessTokenExpiresAt? }`; both throw `MetaConnectFailedException` on non-2xx. Co-located unit test covers happy + failure for each + the `accessTokenExpiresAt` derivation from `expires_in`.
**Where**: `meta-coex-token.ts` + `__test__/unit/meta-coex-token.spec.ts`.
**Depends on**: T1.
**Reuses**: `FetchFn` + `META_GRAPH_API_BASE` from `meta-send.ts`.
**Requirement**: COEX-04, COEX-12.
**Tests**: unit.
**Gate**: quick.

### T4: `subscribeWabaToMeta` accepts `subscribedFields`

**What**: Extend the helper to accept `subscribedFields: string` (default `'messages'`); Coex passes `'messages,smb_message_echoes,smb_app_state_sync'`. Co-located test extended.
**Where**: `meta-subscribe.ts` + `__test__/unit/meta-subscribe.spec.ts`.
**Depends on**: None (independent surface). Run after T3 for cohesion.
**Reuses**: existing helper.
**Requirement**: COEX-05.
**Tests**: unit.
**Gate**: quick.

### T5: `parseMetaInbound` field dispatcher

**What**: Walk each `change.field` and dispatch: `messages` → existing collector, `smb_message_echoes` → new collector reading `value.message_echoes[]` and mapping each echo as InboundMessage with `from = echo.to` (the customer phone) and `toExternalId = echo.from` (the business phone). Unknown / `smb_app_state_sync` / `history` → `[]`. Co-located test covers each branch.
**Where**: `meta-inbound.ts` + `meta-whatsapp.plugin.spec.ts` (extend existing).
**Depends on**: T4 (no real coupling; ordering for cohesion).
**Reuses**: existing collector pattern.
**Requirement**: COEX-07, COEX-09, COEX-15, COEX-16.
**Tests**: unit.
**Gate**: quick.

### T6: `MetaWhatsappPlugin` Coex-aware updates + tests

**What**: Constructor accepts `{ baseUrl?, fetchFn?, config? }` where `config = { appId, appSecret }`. `send` derives bearer by `channelMode`. `onAccountCreated`: cloud_api uses existing `subscribeMetaChannel`; Coex uses `subscribeWabaToMeta` only (skip app-level) with the extended `subscribedFields`. `refreshCredentials`: cloud_api passthrough; Coex calls `exchangeForRefreshedToken`. Plugin module factory provider injects `ConfigService<Config>`.
**Where**: `meta-whatsapp.plugin.ts` + `channel.module.ts` + existing plugin spec.
**Depends on**: T2, T3, T4, T5.
**Reuses**: 029 patterns + 030 hook surface.
**Requirement**: COEX-05, COEX-07, COEX-09, COEX-11, COEX-12, COEX-13, COEX-14.
**Tests**: unit (fat — branching by channelMode).
**Gate**: quick.

### T7: API contract + Routes entry for connect endpoint

**What**: `packages/api-contracts/src/channel/connect-meta-coex.contract.ts` exporting request/response zod schemas. Add `Routes.connectMetaCoex(workspaceId)` entry.
**Where**: `packages/api-contracts/src/channel/` + `packages/api-contracts/src/routes/index.ts` + `index.ts` barrel.
**Depends on**: T2.
**Reuses**: existing contract pattern.
**Requirement**: COEX-03.
**Tests**: none (contract).
**Gate**: build.

### T8: `ConnectMetaCoexUseCase` + controller endpoint + e2e

**What**: Use-case validates app-wide config presence, calls `exchangeCodeForToken`, builds Coex credentials, pre-mints id, runs `plugin.onAccountCreated`, persists via `ChannelAccountRepository.create`. Wires a new method on `ChannelAccountController` (POST endpoint). Co-located e2e drives the fake-Meta flow end-to-end.
**Where**: `apps/api/src/modules/channel/core/use-cases/connect-meta-coex.use-case.ts` + `apps/api/src/modules/channel/http/controllers/channel-account.controller.ts` (+ controller test if applicable) + `apps/api/src/__test__/e2e/meta-coex-connect.spec.ts`.
**Depends on**: T3, T6, T7.
**Reuses**: `CreateChannelAccountUseCase` pattern; the e2e seeds env config via `process.env`.
**Requirement**: COEX-01..06.
**Tests**: unit (use-case branching) + e2e (HTTP).
**Gate**: full.

### T9: `@kizunu/api-client` hook for the connect endpoint

**What**: `packages/api-client/src/channel/connect-meta-coex.api.ts` + `use-connect-meta-coex.ts` TanStack hook.
**Where**: `packages/api-client/src/channel/`.
**Depends on**: T7.
**Reuses**: existing api-client patterns (api-client + per-action hook).
**Requirement**: COEX-03.
**Tests**: none (thin — covered by web e2e or manual verification).
**Gate**: build.

### T10: Web Coex connect page

**What**: `apps/web/src/features/channel/components/connect-meta-coex.tsx` — script-loads the FB SDK, calls `FB.login` with the verified extras (read `META_COEX_CONFIG_ID` + `META_APP_ID` from a new `GET /auth/capabilities` or a build-time-injected env var; for v0.1 fetch from a tiny new `GET /channel-plugins/meta-coex/config` public-capability endpoint). Origin-validate postMessage; on `FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING` POST through the hook. Route under `/workspaces/$workspaceId/channels/connect-meta-coex`.
**Where**: page + route file.
**Depends on**: T9.
**Reuses**: shadcn primitives.
**Requirement**: COEX-01, COEX-02, COEX-03.
**Tests**: none (thin web; manual verification — the FB SDK side-effects cannot be jsdom-tested cleanly).
**Gate**: build.

### T11: ROADMAP + STATE + CONCERNS update + commit hygiene

**What**: Mark feature 031 COMPLETE in ROADMAP; append a STATE entry; cross-reference the deferred 'inbox / contacts store' work that `smb_app_state_sync` will plumb into later.
**Where**: `.specs/project/ROADMAP.md`, `.specs/project/STATE.md`.
**Depends on**: T10.
**Reuses**: existing docs patterns.
**Tests**: none.
**Gate**: build.

---

## Test Co-location Validation

| Task | Code Layer Created/Modified                      | Matrix Requires           | Task Says     | Status |
| ---- | ------------------------------------------------ | ------------------------- | ------------- | ------ |
| T1   | Config + exceptions (declarations)               | none                      | none          | ✅ OK  |
| T2   | Zod schema branching                             | unit                      | unit          | ✅ OK  |
| T3   | Pure helper (fat — request + error branching)    | unit                      | unit          | ✅ OK  |
| T4   | Helper additive option                           | unit                      | unit          | ✅ OK  |
| T5   | Pure parser (fat — field dispatch)               | unit                      | unit          | ✅ OK  |
| T6   | Plugin (fat — branching)                         | unit                      | unit          | ✅ OK  |
| T7   | Shared contract                                  | none                      | none          | ✅ OK  |
| T8   | Use-case (fat) + HTTP controller                 | unit + e2e                | unit + e2e    | ✅ OK  |
| T9   | api-client hook (thin)                           | none                      | none          | ✅ OK  |
| T10  | Web page (thin; SDK side effects)                | none                      | none          | ✅ OK  |
| T11  | Docs                                             | none                      | none          | ✅ OK  |

---

## Commit Plan

- T1: `feat(api): add Meta Coex app-wide config + connect exceptions`
- T2: `feat(api): make metaCredentialsSchema a discriminated union by channelMode`
- T3: `feat(api): add meta-coex-token helpers for code-exchange + refresh`
- T4: `feat(api): make subscribeWabaToMeta accept subscribedFields`
- T5: `feat(api): dispatch parseMetaInbound by field for smb_message_echoes`
- T6: `feat(api): make MetaWhatsappPlugin Coex-aware (send + onAccountCreated + refresh)`
- T7: `feat(api): add ConnectMetaCoex contract + Routes entry`
- T8: `feat(api): add ConnectMetaCoexUseCase + endpoint + e2e`
- T9: `feat(web): add api-client hook for the Coex connect endpoint`
- T10: `feat(web): add the Embedded Signup Coex connect page`
- T11: `docs(infra): mark feature 031 (Coex) complete`
