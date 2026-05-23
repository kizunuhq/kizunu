# Feature 029 — Design

**Spec**: `.specs/features/029-meta-auto-subscribe/spec.md`
**Status**: Approved

---

## Architecture Overview

The slice splits along three seams: the channel-account create path runs an
optional post-validate plugin hook that performs the two Meta subscription calls
and returns the credentials kizunu should persist; the inbound webhook routes
by an unguessable `channelAccountId` in the URL path (the same pattern the CRM
webhook already uses, see
`apps/api/src/modules/engine/http/controllers/crm-webhook.controller.ts`); and
the config layer loses the kizunu-wide `APP_META_VERIFY_TOKEN` because every
verify token now lives on the row.

```mermaid
sequenceDiagram
    participant Web
    participant ChannelCtrl as ChannelAccountController
    participant CreateUC as CreateChannelAccountUseCase
    participant Plugin as MetaWhatsappPlugin
    participant Meta as Graph API
    participant Repo as ChannelAccountRepository
    Web->>ChannelCtrl: POST /workspaces/:id/channel-accounts (pluginId=meta-whatsapp)
    ChannelCtrl->>CreateUC: execute(input)
    CreateUC->>Plugin: validateCredentials (via registry)
    Plugin-->>CreateUC: parsed credentials
    CreateUC->>CreateUC: pre-mint channelAccountId (UUID)
    CreateUC->>Plugin: onAccountCreated({ id, credentials })
    Plugin->>Meta: POST /{appId}/subscriptions (app access token)
    Meta-->>Plugin: 200 OK
    Plugin->>Meta: POST /{wabaId}/subscribed_apps (systemToken)
    Meta-->>Plugin: 200 OK
    Plugin-->>CreateUC: enriched credentials (+verifyToken)
    CreateUC->>Repo: create({ id, credentials })
    Repo-->>CreateUC: { id }
    CreateUC-->>ChannelCtrl: { id, pluginId, name }
    Note over Meta,Plugin: On any non-2xx, plugin throws MetaSubscriptionFailedException; nothing is persisted.

    Note over Meta: Later — every webhook
    Meta->>MetaWebhookCtrl: GET /webhooks/meta/:channelAccountId?hub.verify_token=…
    MetaWebhookCtrl->>Repo: findByIdWithCredentials(id)
    Repo-->>MetaWebhookCtrl: account or undefined
    MetaWebhookCtrl-->>Meta: hub.challenge (200) | 403 | 404
    Meta->>MetaWebhookCtrl: POST /webhooks/meta/:channelAccountId
    MetaWebhookCtrl->>Plugin: parseInbound(raw)
    MetaWebhookCtrl->>MarkReplyUC: execute({ workspaceId, phone })
```

---

## Code Reuse Analysis

### Existing Components to Leverage

| Component                              | Location                                                                                          | How to Use                                                                                                    |
| -------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `ChannelPlugin` port                   | `apps/api/src/modules/channel/core/plugin/channel-plugin.ts`                                      | Add a single optional `onAccountCreated?` hook (does not break the frozen required surface).                  |
| `MetaCredentialsSchema`                | `apps/api/src/modules/channel/plugins/meta-whatsapp/meta-credentials.ts`                          | Extend to add `appId`, `appSecret`, `verifyToken`. All `min(1)`; `.strict()` stays.                           |
| `sendMetaMessage` pattern              | `apps/api/src/modules/channel/plugins/meta-whatsapp/meta-send.ts`                                 | Mirror its `FetchFn` injection and `baseUrl` constructor option for the new subscription functions.            |
| `CreateChannelAccountUseCase`          | `apps/api/src/modules/channel/core/use-cases/create-channel-account.use-case.ts`                  | Add the pre-mint id + `onAccountCreated` invocation between `validateCredentials` and `accounts.create`.       |
| `ChannelAccountRepository.create`      | `apps/api/src/modules/channel/persistence/channel-account.repository.ts`                          | Accept an optional explicit `id` (UUIDv7 from `crypto.randomUUID` polyfill) in the insert.                     |
| `ApplicationException` envelope        | `@kizunu/nestjs-shared/lib/exceptions/application.exception`                                      | New `MetaSubscriptionFailedException` extending it — same envelope the rest of the channel errors use.         |
| CRM webhook URL-as-secret pattern      | `apps/api/src/modules/engine/http/controllers/crm-webhook.controller.ts`                          | The same unguessable-UUID-in-the-path approach; mirror its `findById` + `NotFoundException` flow.              |
| `meta-credential-fields.spec.ts` drift guard | `apps/api/src/modules/channel/plugins/meta-whatsapp/__test__/unit/meta-credential-fields.spec.ts` | No change to its assertion shape — it already iterates required fields and asserts descriptor ↔ schema parity. |

### Integration Points

| System                        | Integration Method                                                                                                                                                                                                                                                |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Meta Graph API                | Outbound `POST /{appId}/subscriptions` + `POST /{wabaId}/subscribed_apps`. Injected via the same `FetchFn` seam as `sendMetaMessage` so the test e2e can fake both legs.                                                                                          |
| `MarkReplyUseCase`            | Unchanged. `MetaWebhookController` still calls it; only the route shape changes from "look up by phoneNumberId in body" to "look up by `:channelAccountId` in path".                                                                                              |
| `apps/web` channel-account form | The form is already generated from `manifest.credentialFields`; adding `appId` + `appSecret` to the descriptor wires them in. The new error context (`step` + `metaError`) is surfaced in the form's existing inline error renderer.                              |

---

## Components

### `MetaWhatsappPlugin.onAccountCreated`

- **Purpose**: Generate the per-channel verify token, perform the two Meta subscription calls, return the credentials enriched with `verifyToken` for persistence.
- **Location**: `apps/api/src/modules/channel/plugins/meta-whatsapp/meta-whatsapp.plugin.ts`
- **Interfaces**:
  - `onAccountCreated(input: { channelAccountId: string; appUrl: string; credentials: unknown }): Promise<MetaCredentials>` — throws `MetaSubscriptionFailedException` on any non-2xx.
- **Dependencies**: `metaCredentialsSchema`, `subscribeMetaChannel` helper, the injected `FetchFn`, the injected `baseUrl`.
- **Reuses**: the `FetchFn` constructor pattern already in the class for `send`.

### `subscribeMetaChannel` (helper)

- **Purpose**: Orchestrate the two Graph API calls, decorating each non-2xx with `step` + `metaStatus` + `metaError` for the error envelope.
- **Location**: `apps/api/src/modules/channel/plugins/meta-whatsapp/meta-subscribe.ts` (new file)
- **Interfaces**:
  - `subscribeAppToMeta({ baseUrl, fetchFn, appId, appSecret, callbackUrl, verifyToken }): Promise<void>` — throws on non-2xx.
  - `subscribeWabaToMeta({ baseUrl, fetchFn, wabaId, systemToken, callbackUrl, verifyToken }): Promise<void>` — throws on non-2xx or `body.success === false`.
  - `subscribeMetaChannel({ baseUrl, fetchFn, appUrl, channelAccountId, credentials }): Promise<{ verifyToken }>` — composes both, generates the verify token, returns it.
- **Dependencies**: `FetchFn`, `crypto.randomBytes` (Node std lib).
- **Reuses**: `META_GRAPH_API_BASE` from `meta-send.ts`.

### `MetaSubscriptionFailedException`

- **Purpose**: Carries `step` (`'app-subscription' | 'waba-subscription'`), `metaStatus`, and optional `metaError` into the `ApplicationException` envelope so the web form can render which step failed and Meta's text.
- **Location**: `apps/api/src/modules/channel/plugins/meta-whatsapp/meta-subscription-failed.exception.ts` (new file — colocated with the plugin per "one type per file" rule).
- **Interfaces**:
  - `new MetaSubscriptionFailedException(step, metaStatus, metaError?)` → ApplicationException(`'channel.meta-subscription-failed'`, `'Meta rejected the webhook subscription.'`, `422`, `{ step, metaStatus, metaError }`).
- **Dependencies**: `ApplicationException` from `@kizunu/nestjs-shared`.
- **Reuses**: the same envelope every other channel error uses.

### `MetaWebhookController` (refactor)

- **Purpose**: Move from a single app-level URL routed by `phoneNumberId` in the body to a per-channel URL routed by `:channelAccountId` in the path.
- **Location**: `apps/api/src/modules/engine/http/controllers/meta-webhook.controller.ts`
- **Interfaces**:
  - `GET /webhooks/meta/:channelAccountId` → echoes `hub.challenge` when supplied `hub.verify_token` matches `credentials.verifyToken`; `403` on mismatch; `404` on unknown id.
  - `POST /webhooks/meta/:channelAccountId` → loads account, calls `plugin.parseInbound`, calls `markReply` per message in that account's workspace; always 200.
- **Dependencies**: `ChannelAccountRepository.findCredentials` (existing) + a new `findWorkspaceAndCredentials(id)` that returns `{ workspaceId, credentials }` so the controller does not need to scan by `phoneNumberId` for the POST branch.
- **Reuses**: the existing `@Public()` + `ChannelPluginRegistry.get(META_PLUGIN_ID)` pattern; the `findByPluginAndCredential` call is dropped.

### `CreateChannelAccountUseCase` (refactor)

- **Purpose**: Add the post-validation hook step and the explicit-id insert path.
- **Location**: `apps/api/src/modules/channel/core/use-cases/create-channel-account.use-case.ts`
- **Interfaces**: unchanged input/output; only the body grows by ~10 lines.
- **Dependencies**: new `appUrl` from `ConfigService`; existing `ChannelPluginRegistry`, `ChannelAccountRepository`.
- **Reuses**: existing `validateCredentials` flow + `accounts.create`; adds explicit `id` propagation through to the insert.

### `ChannelAccount` row create (id pre-mint)

- **Purpose**: Let the use-case pass an explicit `id` so the plugin hook can use it for the subscription callback URL before the row exists.
- **Location**: `apps/api/src/modules/channel/persistence/channel-account.repository.ts`
- **Interfaces**:
  - `create({ id?, workspaceId, pluginId, name, credentials }): Promise<{ id: string }>` — when `id` is supplied it is inserted; otherwise Drizzle's `defaults()` runs.
- **Dependencies**: none new.
- **Reuses**: existing `drizzle.db.insert`. The change is additive — old callers (none, this is the only caller) continue to work.

---

## Data Models (if applicable)

### `MetaCredentials` (schema change)

```typescript
export const metaCredentialsSchema = z
  .object({
    appId: z.string().min(1),
    appSecret: z.string().min(1),
    wabaId: z.string().min(1),
    phoneNumberId: z.string().min(1),
    systemToken: z.string().min(1),
    verifyToken: z.string().min(1),
  })
  .strict()
```

`verifyToken` is required at the schema layer because the row is only persisted
after `onAccountCreated` has filled it in — at every read path (`send`,
`parseInbound`, webhook verify) the field must exist.

`channel_accounts.credentials` is `jsonb` — no migration needed for the storage
layer. Existing pre-029 rows are out-of-shape (no `appId`/`appSecret`/`verifyToken`)
and the operator recreates them; the spec already documents this.

### Plugin port — optional hook

```typescript
export interface ChannelPlugin {
  readonly manifest: ChannelPluginManifest
  validate(input: ValidateInput): ChannelDecision
  parseInbound(raw: unknown, credentials: unknown): Promise<InboundMessage[]>
  send(payload: SendPayload, credentials: unknown): Promise<SendResult>
  onAccountCreated?(input: OnAccountCreatedInput): Promise<unknown>
}

export interface OnAccountCreatedInput {
  channelAccountId: string
  appUrl: string
  credentials: unknown
}
```

The hook returns the (possibly enriched) credentials the use-case should
persist. When absent (the fake plugin and any future plugin that doesn't need
out-of-band onboarding) the use-case keeps the original credentials and skips
the call — the existing path is preserved exactly.

---

## Error Handling Strategy

| Error Scenario                                        | Handling                                                                                                          | User Impact                                                                                            |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| App-level subscription returns non-2xx                | Throw `MetaSubscriptionFailedException('app-subscription', metaStatus, metaError?)`; use-case re-raises; nothing persisted | `422 channel.meta-subscription-failed`; web form renders `step: app-subscription` + Meta's text inline |
| Per-WABA subscription returns non-2xx                 | Throw `MetaSubscriptionFailedException('waba-subscription', metaStatus, metaError?)`                              | Same 422 envelope; form renders `step: waba-subscription`                                              |
| Per-WABA subscription returns 200 with `success:false`| Treat as failure (`MetaSubscriptionFailedException('waba-subscription', 200, body.error?.message)`)               | Same 422; form distinguishes from a true 2xx                                                           |
| `appId`/`appSecret` missing on submit                 | Plugin's `configSchema` rejects → `InvalidChannelCredentialsException` (existing path); web form already disables submit | 422 if request reaches API; form blocks before that                                                    |
| Webhook GET with unknown `channelAccountId`           | Controller returns `404 Not Found`                                                                                | Meta retries the verify; once the row exists it succeeds                                               |
| Webhook GET with wrong `hub.verify_token`             | Controller returns `403 Forbidden`                                                                                | Meta surfaces a verify-failure in the subscription attempt; operator sees the form error               |
| Webhook POST to legacy `/webhooks/meta`               | Route is removed → Nest returns `404`                                                                             | Documented release-note; pre-029 accounts must be recreated                                            |

---

## Tech Decisions (only non-obvious ones)

| Decision                                                                    | Choice                                                                                          | Rationale                                                                                                                                                                                                            |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Where to invoke Meta subscription                                           | Optional `onAccountCreated` hook on the `ChannelPlugin` port                                    | Keeps Meta peculiarities inside the plugin (D2's contract: "Meta peculiarities live inside the plugin"). The port surface stays frozen because the addition is optional — existing plugins (the fake) don't change. |
| Pre-mint the channel-account id vs persist-then-subscribe                   | Pre-mint via `crypto.randomUUID()` and pass into the hook                                       | The Meta `callback_url` includes the id; we need it before either Meta call. Persist-then-subscribe would leave an orphan row on Meta failure or require a transaction across an external HTTP call.                |
| Routing the webhook                                                         | URL `:channelAccountId` (same shape as CRM webhook)                                             | An unguessable UUID is already the v0.1 webhook-secret pattern (`CONCERNS.md` flags it as low pilot-risk). Drops the `findByPluginAndCredential` scan; aligns with Meta's `override_callback_uri`.                   |
| Keep an env-wide `META_VERIFY_TOKEN` fallback for the legacy URL            | **No.** Delete the legacy `/webhooks/meta` route and the env var.                               | A fallback path is dead weight — no Meta subscription points at it after 029, and keeping it widens the trust surface (anyone with the env token could subscribe a rogue customer's WABA to point at our deploy).   |
| Treat the WABA subscription's `success: false` body as failure              | **Yes.** Even on HTTP 200.                                                                      | Graph API can return `200` with `{ success: false, error }` for half-failures; novu's reference does the same in `subscribeWabaMessagesField`.                                                                       |
| Re-subscribe / update flow                                                  | **Out of scope (spec).** Re-subscribe is implicit on a fresh create.                            | Channel-account update doesn't exist as an endpoint today; building it now is scope creep. The encryption work that lands in 030 will be the right moment to revisit.                                                |
| Backfill existing rows                                                      | **No backfill.** Pre-029 rows must be recreated by the operator.                                | Drift from spec wording is acceptable for the pilot scale (≤1 Meta account in flight); a backfill SQL migration touching opaque JSONB credentials is brittle and not generic.                                        |
| Verify-token entropy                                                        | 32 bytes hex (64 chars) via `crypto.randomBytes(32).toString('hex')`                            | Matches the entropy of session tokens elsewhere in the repo; Meta has no upper bound documented but 1–255 is the practical safe range.                                                                               |

---

## Risks & Mitigations

| Risk                                                                                                                          | Mitigation                                                                                                                                                                                                                |
| ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Adding an optional hook to the frozen `ChannelPlugin` port reopens the contract (D2)                                          | The addition is strictly optional; the required surface stays identical. Documented in this design and reaffirmed in the slice's STATE.md update.                                                                         |
| Tests cannot reach Meta — must fully fake the Graph API                                                                       | Reuse the `FetchFn` injection pattern from `meta-send.ts` so the e2e installs a fake that asserts the two outgoing requests and returns the canned responses. Existing `meta-credentials.spec.ts` is the proven pattern.  |
| Pre-029 rows break silently (read endpoints don't validate credentials)                                                       | The new schema is `.strict()` and required everywhere `metaCredentialsSchema.parse(credentials)` runs (`send`, `parseInbound`'s downstream, and the controller's verify-token check). Old rows fail loudly the first time.|
| `credentials` is still plaintext JSONB — the new `verifyToken` adds another secret on disk                                    | Documented in `CONCERNS.md` already; 030 brings `EncryptedCredentialsService`. No incremental mitigation in 029 beyond the existing read-endpoint omission.                                                              |

---

## Tips

- Subscription failure messages from Meta sometimes nest under `error.message`,
  sometimes under `error.error_data.details`. The helper extracts whichever is
  present, returns `undefined` when neither is.
- For the webhook GET, mirror the CRM webhook's `findById` style — accept any
  string path param and return `404` rather than throwing on a bad UUID;
  exception filters render that cleanly.
- The drift guard test (`meta-credential-fields.spec.ts`) does NOT need to know
  about `verifyToken` specifically — it iterates required fields generically.
  Adding `verifyToken` to the schema as required (and to the descriptor as
  required) keeps the test green.
- Don't add `verifyToken` to `credentialFields` as a *user-editable* input —
  it's server-generated. Add it as a hidden field by **omitting** it from the
  descriptor; the descriptor is for inputs only, not for everything on the
  schema. But the drift guard asserts descriptor keys === schema keys… so we
  must either (a) extend the drift guard to allow server-generated fields, or
  (b) ship `verifyToken` as a hidden input with `required: false`. **Choose
  (a)** — add a `serverGenerated: true` marker the drift guard understands; the
  web form skips inputs flagged that way. Cleaner than masking via `required:
  false` which lies about the schema.
