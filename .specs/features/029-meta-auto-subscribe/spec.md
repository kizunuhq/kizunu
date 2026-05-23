# Meta Auto Webhook Subscription Specification

## Problem Statement

The v0.1 Meta/WhatsApp onboarding stops half-way: the operator pastes WABA ID,
phone-number ID, and a System Token, but then has to leave kizunu, open the Meta
App dashboard, paste the kizunu callback URL, paste the env-wide
`APP_META_VERIFY_TOKEN`, and click "Subscribe" — a step that's invisible to
kizunu, easy to skip, and fans out a single shared verify token across every
customer that the same kizunu instance ever onboards. We need kizunu to perform
both Meta subscription calls on its own, with a fresh per-channel verify token,
so the customer onboarding ends inside the product.

The slice has to ship on the existing **standalone Cloud API** flow — Coex
(feature 031) is not a prerequisite, because the moment a paste-credentials
customer benefits, the support burden of "did you remember to subscribe the
webhook?" disappears. Pattern follows novu's `subscribeAppToWhatsAppEvents` +
`subscribeWabaMessagesField`, distilled in
[`.specs/research/whatsapp-coexistence/context.md`](../../research/whatsapp-coexistence/context.md)
section D.4.

## Goals

- [ ] Channel-account creation calls Meta's two-step subscription flow
      (app-level `POST /{appId}/subscriptions` → per-WABA
      `POST /{wabaId}/subscribed_apps`) automatically; the operator never opens the
      Meta dashboard.
- [ ] Each `ChannelAccount` carries its own server-generated `verifyToken`; the
      single env-wide `APP_META_VERIFY_TOKEN` is removed.
- [ ] `metaCredentialsSchema` gains `appId` + `appSecret` so kizunu can build the
      App Access Token (`{appId}|{appSecret}`) needed for the app-level call.
- [ ] The Meta inbound webhook moves from a single `/webhooks/meta` URL to a
      per-channel `/webhooks/meta/:channelAccountId` URL, removing the
      `phone_number_id` routing scan and aligning with the per-WABA
      `override_callback_uri` we send Meta.
- [ ] Subscription failures fail the channel-account create with a `422`
      business-rule error; nothing partial is persisted.

## Out of Scope

| Feature                                              | Reason                                                                                              |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| WhatsApp Coexistence / Embedded Signup               | Lands in feature 031 (depends on 029 + 030).                                                        |
| OAuth credential lifecycle primitives                | Lands in feature 030 (shared `oauthCredentialFields` mixin + refresh + at-rest encryption).         |
| At-rest encryption of `credentials`                  | Covered by 030 (the `EncryptedCredentialsService`); 029 keeps the existing plaintext-JSONB posture. |
| Update / rotate / re-subscribe admin action          | Re-subscribe is implicit on a fresh create; explicit rotate is Phase 2+ once the encryption lands.  |
| Backfill of pre-029 `ChannelAccount` rows            | Existing rows lack `appId`/`appSecret`/`verifyToken`; operator recreates them. Surfaced in release notes. |
| Subscribing extra fields (`smb_message_echoes`, …)   | Coex-only signals — feature 031 adds them.                                                          |
| Retry policy / exponential backoff on Meta 5xx       | One-shot call wrapped in a try/catch; pilot-scale traffic doesn't justify a retry queue yet.        |
| Engine reply semantics (`MarkReplyUseCase`)          | Unchanged — the per-channel URL routes a webhook to a single account, but the reply use-case is the same. |

---

## User Stories

### P1: Operator onboards a Meta channel without leaving kizunu ⭐ MVP

**User Story**: As a workspace admin, I want kizunu to subscribe my Meta App
and my WABA to webhook events on its own when I add a Meta channel account, so
that I never have to paste callback URLs into the Meta dashboard.

**Why P1**: The whole point of the slice — collapse the cross-product hop that
breaks first-pilot setup.

**Acceptance Criteria**:

1. WHEN the operator submits a Meta channel-account create with valid `appId`,
   `appSecret`, `wabaId`, `phoneNumberId`, and `systemToken` THEN kizunu SHALL
   call `POST {graphBase}/{appId}/subscriptions` with
   `object=whatsapp_business_account`, `fields=messages`,
   `callback_url=${APP_URL}/webhooks/meta/${id}`,
   `verify_token=${generatedVerifyToken}`, and
   `access_token=${appId}|${appSecret}`.
2. WHEN the app-level subscription succeeds THEN kizunu SHALL call
   `POST {graphBase}/{wabaId}/subscribed_apps` with
   `override_callback_uri=${APP_URL}/webhooks/meta/${id}`,
   `verify_token=${generatedVerifyToken}`, `subscribed_fields=messages`, and
   `access_token=${systemToken}`.
3. WHEN both calls return success THEN the `ChannelAccount` SHALL be persisted
   with the generated `verifyToken` inside `credentials`.
4. WHEN either Meta call returns a non-2xx status THEN the use-case SHALL throw a
   `422` business-rule error with code `channel.meta-subscription-failed` and
   the channel account SHALL NOT be persisted.

**Independent Test**: Hit `POST /workspaces/:id/channel-accounts` with valid
Meta credentials, point the plugin's `fetchFn` at a fake Graph API in the test,
assert the two outgoing calls and that the row is persisted; flip the fake to
return 400 and assert no row is written.

---

### P1: Each channel owns its inbound URL and verify token ⭐ MVP

**User Story**: As a kizunu operator running multiple customers on one
instance, I want each Meta channel account to have its own webhook URL and
verify token, so that one customer's leaked or rotated token does not break
another customer's webhook.

**Why P1**: Per-customer isolation is table stakes once kizunu has more than one
Meta tenant on the same deploy — and the spec wording in section D.4 of the
research bundle calls it out explicitly.

**Acceptance Criteria**:

1. WHEN a `ChannelAccount` is created THEN its `credentials.verifyToken` SHALL be
   a server-generated, cryptographically-random string (≥32 hex chars). Client
   input for `verifyToken` SHALL be ignored.
2. WHEN `GET /webhooks/meta/:channelAccountId?hub.mode=subscribe&hub.verify_token=…&hub.challenge=…`
   matches that account's `credentials.verifyToken` THEN the controller SHALL
   echo `hub.challenge` with status 200.
3. WHEN the supplied `hub.verify_token` does not match THEN the controller SHALL
   respond `403 Forbidden`. WHEN the `channelAccountId` does not exist THEN the
   controller SHALL respond `404 Not Found`.
4. WHEN `POST /webhooks/meta/:channelAccountId` arrives THEN the controller
   SHALL parse it via the Meta plugin, look up the named channel account, and
   call `MarkReplyUseCase` per inbound message in that account's workspace.
5. WHEN the kizunu API boots THEN config loading SHALL no longer read
   `APP_META_VERIFY_TOKEN`; the value SHALL be removed from
   `apps/api/.env.example`, `deploy/docker-compose.yml`, and the config schema.

**Independent Test**: Create two channel accounts; assert their `verifyToken`s
differ; hit each account's `/webhooks/meta/:id` GET with the matching token →
200 + challenge; with the wrong token → 403; with an unknown id → 404. POST a
sample WhatsApp event to one account's URL and assert `MarkReplyUseCase` is
called only with that account's `workspaceId`.

---

### P1: Meta credentials carry `appId` + `appSecret` ⭐ MVP

**User Story**: As a kizunu operator, I want the channel-account form to ask
me for my Meta App's ID and Secret alongside the existing fields, so that
kizunu can authenticate the app-level subscription call.

**Why P1**: The other two P1 stories can't ship without it — `{appId}|{appSecret}`
is what builds the App Access Token.

**Acceptance Criteria**:

1. WHEN the operator opens the channel-account form for `meta-whatsapp` THEN
   the form SHALL render two new fields, `App ID` (text) and `App Secret`
   (masked input), in addition to the existing three.
2. WHEN the operator submits without `appId` or `appSecret` THEN the form SHALL
   block submit (existing `hasRequiredCredentials` helper) and the API SHALL
   reject with `422` if a request reaches it anyway (via the plugin's
   `configSchema`).
3. WHEN credentials are read back via the list endpoint THEN `appSecret` SHALL
   NOT appear in the response (it never has — the list endpoint already omits
   `credentials`); the masking is therefore inherited, not new.
4. WHEN the plugin's `credentialFields` descriptor is read THEN the
   plugin-local drift guard
   (`meta-credential-fields.spec.ts`) SHALL still pass against
   `metaCredentialsSchema.shape`.

**Independent Test**: Open `/workspace/.../channels/new` in the web app, pick
WhatsApp, observe five fields; submit with one of the new fields blank → the
button stays disabled; submit with all five → the create succeeds (in tests,
the fake Graph API is hit twice).

---

### P2: Subscription failures surface a clear error to the operator

**User Story**: As an operator who pasted a wrong App Secret, I want kizunu to
tell me exactly which Meta step failed, so that I can fix the credential
without digging into logs.

**Why P2**: Cleans up the failure UX. The MVP already returns a 422; this story
adds enough detail for the form to render which step failed.

**Acceptance Criteria**:

1. WHEN the app-level Meta call returns a non-2xx THEN the thrown error's
   `context` SHALL include `{ step: 'app-subscription', metaStatus: number,
   metaError?: string }`.
2. WHEN the per-WABA Meta call returns a non-2xx THEN the thrown error's
   `context` SHALL include `{ step: 'waba-subscription', metaStatus: number,
   metaError?: string }`.
3. WHEN the form receives the 422 THEN it SHALL render the step + Meta error
   message inline, not just a generic toast.

**Independent Test**: Drive the fake Graph API to fail at each step
independently, assert the API response's `context.step`, and snapshot the web
form's inline error rendering.

---

## Edge Cases

- WHEN `APP_URL` is not an `https://` origin THEN the use-case SHALL still
  attempt the Meta call; Meta rejects non-HTTPS at the API edge, surfacing as a
  `422` with `context.step = 'app-subscription'`. (No client-side guard — we
  keep `APP_URL` validation as-is and let Meta be the truth source for what it
  accepts.)
- WHEN the same `appId`/`appSecret` pair has already been subscribed for this
  `callback_url`/`verify_token` THEN Meta returns success (the call is
  idempotent on its side) and kizunu SHALL treat it as success — no special
  branch.
- WHEN the per-WABA call returns success but the `success` flag in the JSON
  body is `false` THEN the use-case SHALL treat it as failure (same `422`,
  `context.step = 'waba-subscription'`, `context.metaError = body.error?.message`).
- WHEN an inbound webhook POST arrives at the legacy `/webhooks/meta` URL THEN
  the controller SHALL respond `404`. The route is deleted, not aliased — the
  operator must re-create channel accounts to migrate.
- WHEN `credentials.verifyToken` is missing on a pre-029 `ChannelAccount` row
  (no migration backfill) THEN the GET handler SHALL respond `403` because no
  supplied token can match an absent stored token.

---

## Requirement Traceability

| Requirement ID | Story                                                | Phase | Status  |
| -------------- | ---------------------------------------------------- | ----- | ------- |
| METASUB-01     | P1: Operator onboards without leaving kizunu         | -     | Pending |
| METASUB-02     | P1: Operator onboards without leaving kizunu         | -     | Pending |
| METASUB-03     | P1: Operator onboards without leaving kizunu         | -     | Pending |
| METASUB-04     | P1: Operator onboards without leaving kizunu         | -     | Pending |
| METASUB-05     | P1: Per-channel URL + verify token                   | -     | Pending |
| METASUB-06     | P1: Per-channel URL + verify token                   | -     | Pending |
| METASUB-07     | P1: Per-channel URL + verify token                   | -     | Pending |
| METASUB-08     | P1: Per-channel URL + verify token                   | -     | Pending |
| METASUB-09     | P1: Per-channel URL + verify token (env removal)     | -     | Pending |
| METASUB-10     | P1: Credentials carry `appId` + `appSecret`          | -     | Pending |
| METASUB-11     | P1: Credentials carry `appId` + `appSecret`          | -     | Pending |
| METASUB-12     | P1: Credentials carry `appId` + `appSecret` (drift)  | -     | Pending |
| METASUB-13     | P2: Subscription failures surface step + meta error  | -     | Pending |
| METASUB-14     | P2: Subscription failures surface step + meta error  | -     | Pending |
| METASUB-15     | P2: Subscription failures (web error rendering)      | -     | Pending |

**Coverage:** 15 total. Design **invoked** — the WAA spec wording (D.4) +
the URL-shape refactor + the rollback semantics warrant a design pass to lock
the seam before tasking.

---

## Success Criteria

- [ ] A fake-Graph-API e2e creates a Meta channel account end-to-end and observes
      both subscription calls being made with the expected bodies and a
      per-account verify token.
- [ ] No reference to `APP_META_VERIFY_TOKEN` remains in the repo
      (`grep -r APP_META_VERIFY_TOKEN` returns empty).
- [ ] `bun check` is green; lint clean under CI strictness.
- [ ] `meta-credential-fields.spec.ts` (drift guard) is green against the new
      schema shape.
