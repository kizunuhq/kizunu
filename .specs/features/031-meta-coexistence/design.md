# Feature 031 — Design

**Spec**: `.specs/features/031-meta-coexistence/spec.md`
**Status**: Approved

---

## Architecture Overview

031 composes onto the shipped primitives — the per-channel webhook URL from
`029` and the encrypted-credentials + OAuth-refresh primitives from `030`. The
slice adds three pieces to the existing Meta plugin module and one new
controller, plus a web page that orchestrates the Embedded Signup popup.

```mermaid
sequenceDiagram
    participant Web
    participant Meta as Meta FB.login popup
    participant Connect as MetaCoexConnectController
    participant Plugin as MetaWhatsappPlugin
    participant Graph as Graph API
    participant Repo as ChannelAccountRepository

    Web->>Meta: FB.login({ config_id, extras.featureType=whatsapp_business_app_onboarding })
    Meta-->>Web: postMessage { event: FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING, data: { business_id, waba_id, phone_number_id }, code }
    Web->>Connect: POST /workspaces/:id/channel-accounts/meta-whatsapp/connect
    Connect->>Graph: GET /oauth/access_token?client_id=APP_ID&client_secret=APP_SECRET&code
    Graph-->>Connect: { access_token, expires_in }
    Connect->>Plugin: onAccountCreated({ channelAccountId, appUrl, credentials: { channelMode: 'coexistence', wabaId, phoneNumberId, accessToken, accessTokenExpiresAt } })
    Plugin->>Graph: POST /{wabaId}/subscribed_apps  (override_callback_uri, verify_token, subscribed_fields=messages,smb_message_echoes,smb_app_state_sync)
    Graph-->>Plugin: ok
    Plugin-->>Connect: enriched credentials (+ verifyToken)
    Connect->>Repo: create({ credentials: encrypted by 030 boundary })

    Note over Web,Repo: Later — inbound
    Graph->>Webhook: POST /webhooks/meta/:channelAccountId  field=smb_message_echoes | smb_app_state_sync | history | messages
    Webhook->>Plugin: parseInbound(rawBody, credentials)
    Plugin-->>Webhook: InboundMessage[] (echoes mapped same as messages; other fields → [])
    Webhook->>MarkReply: per message in row's workspace

    Note over Plugin,Graph: Background — refresh
    OAuthRefreshService->>Plugin: refreshCredentials({ channelAccountId, credentials })
    Plugin->>Graph: GET /oauth/access_token?grant_type=fb_exchange_token&fb_exchange_token=<current>
    Graph-->>Plugin: { access_token, expires_in }
    Plugin-->>OAuthRefreshService: { ...credentials, accessToken, accessTokenExpiresAt }
```

---

## Code Reuse Analysis

### Existing Components to Leverage

| Component                                            | Location                                                                                          | How to Use                                                                                                                                                                                            |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MetaWebhookController` (per-channel URL, `029`)     | `apps/api/src/modules/engine/http/controllers/meta-webhook.controller.ts`                         | Unchanged — already path-routes by `:channelAccountId` and calls `plugin.parseInbound`. The Coex field-dispatch happens INSIDE the plugin, the controller stays generic.                              |
| `subscribeWabaToMeta` + `subscribeMetaChannel` (`029`) | `apps/api/src/modules/channel/plugins/meta-whatsapp/meta-subscribe.ts`                            | `subscribeWabaToMeta` extends to accept a `subscribedFields` param (defaults to `'messages'`); Coex passes `'messages,smb_message_echoes,smb_app_state_sync'`. App-level call is skipped in Coex.    |
| `oauthCredentialFields` mixin (`030`)                | `packages/api-contracts/src/shared/oauth-credential-fields.ts`                                    | Spread into the new Coex credentials schema variant — every OAuth-using plugin uses the same shape.                                                                                                  |
| `EncryptedCredentialsService` (`030`)                | `@kizunu/nestjs-shared/modules/persistence/services/encrypted-credentials.service.ts`             | Unchanged — the new connect endpoint persists through `ChannelAccountRepository.create`, which already encrypts at the boundary.                                                                      |
| `OAuthRefreshService` + `refreshCredentials?` hook   | `apps/api/src/modules/channel/core/services/oauth-refresh.service.ts` + `ChannelPlugin` port      | The Meta plugin implements the hook; the service already polls and dispatches. No service changes.                                                                                                    |
| `CreateChannelAccountUseCase.onAccountCreated` seam  | `apps/api/src/modules/channel/core/use-cases/create-channel-account.use-case.ts`                  | Unchanged. The new `MetaCoexConnectUseCase` runs the same hook path internally (validate → pre-mint id → hook → persist).                                                                            |
| `ApplicationException` envelope                      | `@kizunu/nestjs-shared/lib/exceptions/application.exception`                                      | New `MetaConnectFailedException` (422, `channel.meta-connect-failed`) for `/oauth/access_token` failures + a `MetaCoexNotConfiguredException` (422) for missing app-wide env vars.                  |
| `parseMetaInbound`                                   | `apps/api/src/modules/channel/plugins/meta-whatsapp/meta-inbound.ts`                              | Extends with a per-field dispatcher: `messages` → existing path, `smb_message_echoes` → new collector, others → `[]`.                                                                                |
| `ConfigService<Config>`                              | existing                                                                                          | New config fields `meta.appId`, `meta.appSecret`, `meta.coexConfigId` injected into the plugin via a factory provider.                                                                                |

### Integration Points

| System                | Integration Method                                                                                                                                                                                                                                |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Meta Graph API        | `GET /oauth/access_token` (code → token), `GET /oauth/access_token?grant_type=fb_exchange_token` (refresh), `POST /{wabaId}/subscribed_apps` (override + extended fields). All via the same `FetchFn` seam as `meta-send.ts`.                    |
| `apps/web`            | New `connect-meta-coex.tsx` page that script-loads the FB JS SDK, calls `FB.login` with the verified extras, listens for the `WA_EMBEDDED_SIGNUP` postMessage, and `useCreateMetaCoexConnect()` posts the payload via the typed api-client.        |
| `OAuthRefreshService` | Already poll-dispatches `refreshCredentials`; the Meta plugin's hook does the work.                                                                                                                                                                |

---

## Components

### Config additions

- **Purpose**: Surface `META_APP_ID`, `META_APP_SECRET`, `META_COEX_CONFIG_ID`
  as kizunu-wide config. Required only when Coex is exercised — they default
  to `''` so the standalone Cloud API path continues to boot without them, and
  the connect endpoint validates presence at call time with
  `MetaCoexNotConfiguredException`.
- **Location**: `apps/api/src/api.config.ts`, `apps/api/.env.example`, `deploy/docker-compose.yml`.

### `metaCredentialsSchema` (discriminated union)

- **Purpose**: A single zod discriminated union on `channelMode` with two
  branches. `cloud_api` carries the existing 6 fields (already shipped in
  `029`); `coexistence` swaps `appId`/`appSecret`/`systemToken` for the
  `oauthCredentialFields` mixin.
- **Location**: `apps/api/src/modules/channel/plugins/meta-whatsapp/meta-credentials.ts`.
- **Shape**:
  ```typescript
  const cloudApi = z.object({
    channelMode: z.literal('cloud_api'),
    appId: z.string().min(1),
    appSecret: z.string().min(1),
    wabaId: z.string().min(1),
    phoneNumberId: z.string().min(1),
    systemToken: z.string().min(1),
    verifyToken: z.string().min(1),
  }).strict()
  const coexistence = z.object({
    channelMode: z.literal('coexistence'),
    wabaId: z.string().min(1),
    phoneNumberId: z.string().min(1),
    verifyToken: z.string().min(1),
    ...oauthCredentialFields,
  }).strict()
  export const metaCredentialsSchema = z.discriminatedUnion('channelMode', [cloudApi, coexistence])
  ```
- **Client-input variant**: `metaCredentialsClientSchema = cloudApi.omit({ verifyToken: true })` —
  Coex inputs do NOT go through `validateCredentials` (operator never types
  Coex creds; the connect endpoint constructs them server-side).

### `MetaWhatsappPlugin` updates

- **Purpose**: Branch by `channelMode` for `send` (bearer source), `onAccountCreated`
  (subscription fields), `refreshCredentials` (Coex-only token exchange), and
  the Coex `meta.appId/appSecret/coexConfigId` resolution.
- **Location**: `apps/api/src/modules/channel/plugins/meta-whatsapp/meta-whatsapp.plugin.ts`.
- **Interfaces**:
  - Constructor takes `{ config?: { appId, appSecret } }` so the plugin can read app-wide credentials in Coex mode without coupling to `ConfigService`.
  - `send(payload, creds)` derives the bearer from `creds.channelMode`.
  - `onAccountCreated(input)` branches:
    - `cloud_api`: existing `subscribeMetaChannel(...)` — both app-level and per-WABA, subscribedFields=`messages`.
    - `coexistence`: ONLY the per-WABA `subscribeWabaToMeta(...)` (Meta handles app-level during signup), subscribedFields=`messages,smb_message_echoes,smb_app_state_sync`.
  - `refreshCredentials(input)` branches:
    - `cloud_api`: return input unchanged.
    - `coexistence`: GET `/oauth/access_token?grant_type=fb_exchange_token&client_id&client_secret&fb_exchange_token=<current>` → new token; recompute `accessTokenExpiresAt = now + expires_in`. Throws on non-2xx.

### `meta-coex-token.ts` (helpers)

- **Purpose**: Two pure helpers — `exchangeCodeForToken({ code, ... })` (the
  initial code→token swap during connect) and `exchangeForRefreshedToken({
  currentToken, ... })` (the refresh long-lived swap).
- **Location**: `apps/api/src/modules/channel/plugins/meta-whatsapp/meta-coex-token.ts`.
- **Interfaces**:
  - `exchangeCodeForToken({ baseUrl, fetchFn, appId, appSecret, code }): Promise<{ accessToken: string; accessTokenExpiresAt?: string }>` — throws `MetaConnectFailedException` on non-2xx.
  - `exchangeForRefreshedToken({ baseUrl, fetchFn, appId, appSecret, currentToken }): Promise<{ accessToken: string; accessTokenExpiresAt?: string }>` — throws on non-2xx.
- **Reuses**: the same `FetchFn` + `META_GRAPH_API_BASE` seam used by `meta-send.ts` and `meta-subscribe.ts`.

### `MetaCoexConnectUseCase` + controller endpoint

- **Purpose**: Server side of Embedded Signup. Validates the env-vars
  presence (fail with `MetaCoexNotConfiguredException` if any of `meta.appId`,
  `meta.appSecret`, `meta.coexConfigId` is missing), calls
  `exchangeCodeForToken`, then runs the same pre-mint + hook + persist flow
  as `CreateChannelAccountUseCase` with Coex credentials.
- **Location**:
  - Use-case: `apps/api/src/modules/channel/core/use-cases/connect-meta-coex.use-case.ts`.
  - Controller: a new method on `ChannelAccountController`,
    `POST :id/channel-accounts/meta-whatsapp/connect`.
  - Contract: `packages/api-contracts/src/channel/connect-meta-coex.contract.ts` +
    `Routes.connectMetaCoex(id)` entry.
  - Web hook: `packages/api-client/src/channel/use-connect-meta-coex.ts`.

### `parseMetaInbound` field dispatcher

- **Purpose**: Extend the existing parser to dispatch on the change's `field`
  value: `messages` (current path), `smb_message_echoes` (new collector), other
  fields → `[]` with a debug log. Plugin's `parseInbound(raw, credentials)`
  uses `credentials.channelMode` to gate whether echoes are accepted.
- **Location**: `apps/api/src/modules/channel/plugins/meta-whatsapp/meta-inbound.ts`.

### Web — `connect-meta-coex.tsx`

- **Purpose**: Loads the FB JS SDK by injecting a `<script>`, initializes it
  with `appId` (fetched from a new public capability endpoint or hard-coded as
  a build flag), and on button-click calls `FB.login` with the documented
  Coex extras. Listens for `message` events from `*.facebook.com` origins;
  on `FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING` POSTs the payload via the new
  hook. CANCEL / error states re-render the button + an inline message.
- **Location**: `apps/web/src/features/channel/components/connect-meta-coex.tsx`
  + a route under `apps/web/src/routes/(app)/workspaces/$workspaceId/channels/`.

---

## Data Models

### `MetaCredentials` (discriminated)

Already sketched above — two branches by `channelMode`. The pgEnum / column
stays as plain `jsonb` (the discriminator lives inside the JSON). The 030
encryption boundary handles both shapes uniformly because it serializes the
whole object.

### Connect endpoint contract

```typescript
const ConnectMetaCoexRequest = z.object({
  code: z.string().min(1),
  businessId: z.string().min(1),
  wabaId: z.string().min(1),
  phoneNumberId: z.string().min(1),
  name: z.string().min(1).max(120),
})
const ConnectMetaCoexResponse = z.object({
  id: z.uuid(),
  pluginId: z.literal('meta-whatsapp'),
  channelMode: z.literal('coexistence'),
  name: z.string(),
})
```

---

## Error Handling Strategy

| Error Scenario                                                | Handling                                                                                                            | User Impact                                                                       |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Missing app-wide env vars (`appId`, `appSecret`, `coexConfigId`) | `MetaCoexNotConfiguredException(422, 'channel.meta-coex-not-configured')`                                            | Web form renders "Embedded Signup not configured" inline.                          |
| `/oauth/access_token` non-2xx (code expired/replayed)         | `MetaConnectFailedException(422, 'channel.meta-connect-failed', context: { step: 'code-exchange', metaStatus })`     | Web form renders "Could not exchange the code" inline.                            |
| Per-WABA subscription failure (existing 029 path)             | `MetaSubscriptionFailedException` — already covered by 029                                                          | Same form rendering as 029.                                                       |
| Refresh hook failure                                          | Hook throws → `OAuthRefreshService` already counts + retries (030)                                                  | Cadence keeps using the still-valid token until the next tick succeeds.           |
| Echo arrives for a `cloud_api` channel                         | Plugin returns `[]` from `parseInbound` for the unexpected field; webhook still 200-acks                            | Invisible; defense-in-depth.                                                       |
| `smb_app_state_sync` / `history`                              | Parsed shape is recognized; `parseInbound` returns `[]`; controller logs + 200-acks                                 | No-op for v0.1.                                                                    |

---

## Tech Decisions (non-obvious)

| Decision                                                                       | Choice                                                                                                  | Rationale                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Where `appId` + `appSecret` + `coexConfigId` live                              | Kizunu-wide config (env)                                                                                | Same Meta App owns every Coex onboarding on a deploy; per-row duplication of the same value would drift. Documented in research §G.                                                                                                                              |
| Schema model                                                                   | Discriminated union by `channelMode`                                                                    | Each mode has a strict required-fields set; a union enforces it. Single schema for storage; the plugin can `switch(creds.channelMode)` exhaustively.                                                                                                              |
| App-level subscription in Coex                                                 | **Skip.** Only the per-WABA call runs.                                                                  | Meta handles app-level subscription during Embedded Signup. Calling it again with a kizunu-supplied callback would race the signup-installed one.                                                                                                                |
| `smb_app_state_sync` / `history` handling                                       | Parse shape, log, 200-ack (no persistence).                                                             | No inbox / contacts backend in v0.1 (CONCERNS). Acknowledging stops Meta retries; a future slice plumbs them when the inbox lands.                                                                                                                              |
| Where the FB SDK loads                                                          | Inside the Coex connect page only (`apps/web/.../connect-meta-coex.tsx`).                               | The SDK is a heavy third-party blob; only one page needs it. Lazy-loaded via script tag.                                                                                                                                                                       |
| Plugin construction (DI)                                                        | Factory provider that injects `ConfigService` and constructs `new MetaWhatsappPlugin({ config })`.       | Keeps the plugin out of Nest DI directly; the test patterns (`new MetaWhatsappPlugin({ fetchFn })`) still work.                                                                                                                                                  |
| Connect endpoint vs. existing `POST /workspaces/:id/channel-accounts`           | New sibling endpoint `POST /workspaces/:id/channel-accounts/meta-whatsapp/connect`.                     | The two flows have different inputs (operator credentials vs. OAuth code) and need different validation. Sharing the controller through a discriminator would cross-cut for no win.                                                                              |
| Echo → `MarkReplyUseCase` (and no `lastInboundAt` advancement)                 | Parse echoes as `InboundMessage`; the existing MarkReply path is reused.                                | The plugin port has no separate "echo" type. `MarkReply` only transitions journey status, not freeform-window state. Future plumbing that needs `lastInboundAt` will need an explicit `isEcho` field on `InboundMessage` — TODO documented in the implementation. |

---

## Risks & Mitigations

| Risk                                                                                                                          | Mitigation                                                                                                                                                                                                                  |
| ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FB JS SDK changes signatures / config schema before deprecation                                                                | Pinned to the verified `extras` shape in `snippets/fb-login-coex.js`; Coex onboarding will be re-tested manually before pilot.                                                                                              |
| Coex business token TTL / refresh semantics differ from what we assume                                                         | The refresh helper is a thin wrapper; if Meta changes the grant_type or expects a different endpoint, only `meta-coex-token.ts` changes.                                                                                   |
| `smb_message_echoes` payload shape differs across `to` vs `recipient_id`                                                        | The verified payload (snippets/smb-message-echoes-payload.json) is the contract; the new collector defends against missing fields and returns `[]` for malformed echoes.                                                  |
| `lastInboundAt` plumbing arrives later and silently uses echoes as openers                                                     | The TODO comment on the echo collector documents the constraint; future PR has to add an explicit flag or guard.                                                                                                          |
| Backward-compat: existing pre-031 Meta channels have 6-field `cloud_api` credentials with no `channelMode` field               | Defensive parse: the existing 6-field shape without `channelMode` is interpreted as `cloud_api` (legacy reader); new writes always set the discriminator. Documented + tested.                                            |
| App-level subscription field set changing in production                                                                        | Subscribed-fields list is a single source-of-truth constant; updating it touches one file.                                                                                                                                 |

---

## Tips

- The FB SDK callback shape is `{ type: 'WA_EMBEDDED_SIGNUP', event, data: { business_id, waba_id, phone_number_id } }`. Origin validation MUST come first: `event.origin.endsWith('facebook.com')`.
- Coex's `subscribed_fields` is comma-separated in the Graph API form-encoded body. Keep it in one constant.
- The plugin's `send` derives the bearer once per call — a tiny helper (`bearerFor(creds)`) keeps the branching out of the body building.
- The `MetaCoexConnectUseCase` re-uses 029's pre-mint id pattern; do not invent a parallel flow.
- For the e2e, fake fetch returns canned `/oauth/access_token` and `/{wabaId}/subscribed_apps` responses keyed by URL substring — the same shape the 029 spec uses.
