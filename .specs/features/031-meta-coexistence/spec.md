# WhatsApp Coexistence: Embedded Signup + Coex Webhooks Specification

## Problem Statement

The v0.1 Meta plugin ships standalone Cloud API — the operator pastes a System
Token + WABA + phone-number id, the customer's WhatsApp Business mobile app
goes dark when Cloud API takes over the number, and onboarding requires three
hops through three Meta admin surfaces. Phase 1.8's customer-visible promise
is **Coexistence**: the customer keeps using the WA Business app while kizunu
sends outbound cadences alongside it, with onboarding through Meta's Embedded
Signup popup (no manual webhook configuration, no number migration).

This slice ships that. It depends on the two primitives that already landed:
the per-channel webhook subscription seam from `029`, and the at-rest
credential encryption + OAuth refresh primitives from `030`.

Source-of-truth: [`.specs/research/whatsapp-coexistence/context.md`](../../research/whatsapp-coexistence/context.md)
sections A (canonical Meta docs), D (verified facts on the FB.login extras,
callback events, OAuth exchange, two-step subscription, and the three Coex
webhook payload shapes), and E (customer + Meta constraints, critically E.4:
"echoes do NOT open a 24-hour service window").

**Hard timeline:** Embedded Signup v2 deprecates **2026-10-15** (today is
2026-05-22 — ~5 months runway). This slice builds v4 + sessionInfoVersion 3
from the start; there is no v2 fallback.

## Goals

- [ ] Operator finishes a Meta channel connect inside Embedded Signup —
      `FB.login` with the Coex `featureType` extras, popup callback, kizunu
      exchanges the auth code for a business token, creates a `ChannelAccount`
      with `channelMode: 'coexistence'`. Zero hops through the Meta dashboard.
- [ ] Inbound `smb_message_echoes` events route through `MarkReplyUseCase` so a
      message the customer sends from the WA Business mobile app pauses the
      cadence — but the echo does NOT advance the freeform 24h window (E.4).
- [ ] Coex business tokens auto-refresh via the `030` `refreshCredentials`
      hook well before expiry — no manual operator intervention.
- [ ] `smb_app_state_sync` and `history` webhook fields ack with 200 (logged,
      no-op for v0.1) so Meta does not retry them; a future slice can plumb
      contacts / history into the inbox.

## Out of Scope

| Feature                                                          | Reason                                                                                                                                       |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Contact list / inbox UI fed by `smb_app_state_sync`              | No inbox backend in v0.1 (`CONCERNS.md`). 031 logs + 200-acks; a future slice plumbs contacts into the (also-deferred) conversations store.  |
| `history` 6-month backfill import                                | Same; ROADMAP explicitly defers full import. 031 200-acks only.                                                                              |
| Phone-number registration for migrated Cloud API onboarding      | Coex does NOT call `/{phone_number_id}/register` (Meta handles it during signup; see D.6). The migrated branch will need it later.           |
| Number disconnection / unlink                                    | Customer-controlled (E.5); kizunu's webhook simply stops receiving events. A heartbeat health-check is a Phase 2+ concern.                   |
| OBA (Official Business Account, blue tick)                       | Not supported on Coex per E.3.                                                                                                               |
| Cross-region restrictions surfacing in the UI                    | Pilot customer pre-checks the constraint list (E.1, E.3 unsupported regions); no UI gate.                                                    |
| `disable_voice_calling!` / Coex-specific phone-number settings   | Out of scope; the pilot does not need them.                                                                                                  |

---

## User Stories

### P1: Operator connects a Meta channel via Embedded Signup ⭐ MVP

**User Story**: As a workspace admin, I want to click "Connect WhatsApp" in
kizunu, complete Meta's Embedded Signup popup once, and end up back inside
kizunu with a working channel account, so that I never have to copy WABA IDs
or system tokens.

**Why P1**: This is the customer-visible deliverable of Phase 1.8.

**Acceptance Criteria**:

1. WHEN the operator opens the new `/workspaces/:id/channels/connect-meta-coex` page
   THEN the page SHALL load the Facebook JS SDK (`connect.facebook.net/.../sdk.js`)
   and render a "Connect WhatsApp Business" button.
2. WHEN the operator clicks the button THEN the page SHALL call `FB.login` with the
   verified Coex extras (`featureType: 'whatsapp_business_app_onboarding'`,
   `sessionInfoVersion: '3'`, `config_id: <META_COEX_CONFIG_ID>`,
   `response_type: 'code'`, `override_default_response_type: true`).
3. WHEN the popup posts back a message with `event: 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING'`
   from a `*.facebook.com` origin THEN the page SHALL POST
   `{ code, businessId, wabaId, phoneNumberId, name }` to
   `POST /workspaces/:id/channel-accounts/meta-whatsapp/connect`.
4. WHEN the API endpoint receives the request THEN it SHALL exchange the code for
   a business token (`GET /oauth/access_token?client_id=&client_secret=&code=`),
   compute `accessTokenExpiresAt` from the `expires_in` response field, and
   create a `ChannelAccount` with `channelMode: 'coexistence'` and the encrypted
   credentials (appId/appSecret are kizunu-wide config, NOT on the row).
5. WHEN the create succeeds THEN the same `onAccountCreated` path from `029`
   SHALL subscribe the WABA (`subscribed_fields=messages,smb_message_echoes,smb_app_state_sync`)
   to the per-channel callback URL using the new business token (Coex skips the
   app-level subscription call — Meta handles that during signup).
6. WHEN any step fails (code exchange non-2xx; subscription non-2xx) THEN the
   endpoint SHALL fail with a `422` ApplicationException; nothing is persisted.

**Independent Test**: Drive a fake Meta in the e2e: stub `/oauth/access_token`
to return a token, stub `/{wabaId}/subscribed_apps` to return 200, POST to the
new endpoint, assert a `ChannelAccount` row exists with `channelMode='coexistence'`
and encrypted-on-disk credentials.

---

### P1: Echoes pause the cadence (without advancing the 24h window) ⭐ MVP

**User Story**: As a BDR using the WA Business mobile app to reply manually to
a lead, I want kizunu to pause that lead's cadence the moment my reply lands,
so that the customer does not get a duplicate templated message right after my
personal one.

**Why P1**: This is the engine-level Coex deliverable — the difference between
"Coex onboarding works" and "Coex actually changes how kizunu behaves".

**Acceptance Criteria**:

1. WHEN an inbound `smb_message_echoes` event arrives at
   `POST /webhooks/meta/:channelAccountId` AND the account's `channelMode` is
   `coexistence` THEN the Meta plugin SHALL parse the echo into an
   `InboundMessage` whose `fromExternalId` is the customer phone (`to` in the
   echo payload), and the webhook SHALL call `MarkReplyUseCase` so a running
   journey for that lead transitions to `replied`.
2. WHEN the same event arrives but `channelMode` is `cloud_api` THEN the plugin
   SHALL ignore it (echoes only fire in Coex; the cloud_api branch should not
   process them). The webhook still returns 200.
3. WHEN an echo is processed THEN `lead.lastInboundAt` (and any equivalent
   freeform-window-opening signal) SHALL NOT be touched. (The current pilot
   does not persist `lastInboundAt` separately; this requirement is a guard
   for the future plumbing — section E.4.)
4. WHEN a regular `messages` event arrives in Coex mode THEN it SHALL continue
   to be parsed exactly as today (current path is unchanged).

**Independent Test**: Drive the existing `MetaWebhookController` e2e with a
`smb_message_echoes` payload against a coexistence-mode account; assert
`MarkReplyUseCase` is called with the expected workspace + customer phone.

---

### P1: Coex business tokens refresh on their own ⭐ MVP

**User Story**: As an operator who finished Embedded Signup once, I want my
Coex channel to keep working without me coming back every 60 days to renew a
token, so that the pilot stays live unattended.

**Why P1**: Without refresh, every Coex channel breaks after the token TTL.

**Acceptance Criteria**:

1. WHEN the `MetaWhatsappPlugin` is registered THEN it SHALL implement the
   optional `refreshCredentials` hook from `030`.
2. WHEN `OAuthRefreshService` calls the hook for a coexistence row whose
   `accessTokenExpiresAt` is inside the refresh buffer THEN the plugin SHALL
   GET `/{ver}/oauth/access_token?grant_type=fb_exchange_token&client_id=…&client_secret=…&fb_exchange_token=<currentToken>`
   and return credentials with the refreshed `accessToken` and recomputed
   `accessTokenExpiresAt`.
3. WHEN the channel's `channelMode` is `cloud_api` THEN `refreshCredentials`
   SHALL return the input credentials unchanged (no expiry exists; the hook is
   defensive).
4. WHEN Meta returns a non-2xx on refresh THEN the hook SHALL throw an
   `ApplicationException`; `OAuthRefreshService` counts it as a failed refresh
   (already tested) and leaves the row for the next tick.

**Independent Test**: Unit-test the plugin's hook with a fake `fetchFn` —
coexistence input → token exchanged → returned credentials carry the new
token; cloud_api input → input returned unchanged; HTTP 400 → throws.

---

### P2: Coex webhook fields acknowledge 200 without behavior change

**User Story**: As Meta delivering `smb_app_state_sync` or `history` events
to a kizunu Coex channel, I want kizunu to acknowledge with 200, so that I do
not retry forever or mark the webhook unhealthy.

**Why P2**: Production hygiene; without it Meta retries flood the logs.

**Acceptance Criteria**:

1. WHEN `smb_app_state_sync` arrives THEN the webhook SHALL respond 200 and
   log a `state-sync received` entry with the channel-account id + the number
   of state-sync items (no persistence; documented TODO links to the inbox
   future-slice).
2. WHEN `history` arrives THEN the webhook SHALL respond 200 and log a
   `history received` entry with the channel-account id and the entry count
   (no parsing).
3. WHEN any other unknown field arrives THEN the webhook SHALL still respond
   200 (the Meta plugin returns `[]` from `parseInbound` for unknown shapes,
   per the existing defensive parsing).

**Independent Test**: Post each payload shape (`smb_app_state_sync`,
`history`, an unknown field) to a coexistence-mode channel's webhook URL and
assert 200 + `MarkReplyUseCase` is NOT called.

---

## Edge Cases

- WHEN the FB.login callback emits `CANCEL` THEN the web page SHALL re-show
  the "Connect WhatsApp Business" button (no API call, no state change).
- WHEN the FB.login callback emits `error` with `error_message` THEN the web
  page SHALL render the message inline; the user can retry.
- WHEN the postMessage origin does NOT end with `.facebook.com` THEN the page
  SHALL ignore the event entirely (origin validation, section D.2).
- WHEN the connect endpoint receives a code that has already been exchanged
  (replay) THEN Meta's `/oauth/access_token` returns an error and the endpoint
  responds 422 — kizunu does not need separate idempotency for v0.1 because
  the code is single-use on Meta's side.
- WHEN the kizunu instance has not set `META_APP_ID`, `META_APP_SECRET`, or
  `META_COEX_CONFIG_ID` THEN the connect endpoint SHALL respond 422 with a
  clear "Embedded Signup is not configured on this instance" message.

---

## Requirement Traceability

| Requirement ID | Story                                                    | Phase | Status  |
| -------------- | -------------------------------------------------------- | ----- | ------- |
| COEX-01        | P1: Operator connects via Embedded Signup                | -     | Pending |
| COEX-02        | P1: Operator connects via Embedded Signup                | -     | Pending |
| COEX-03        | P1: Operator connects via Embedded Signup                | -     | Pending |
| COEX-04        | P1: Operator connects via Embedded Signup                | -     | Pending |
| COEX-05        | P1: Operator connects via Embedded Signup                | -     | Pending |
| COEX-06        | P1: Operator connects via Embedded Signup                | -     | Pending |
| COEX-07        | P1: Echoes pause the cadence                              | -     | Pending |
| COEX-08        | P1: Echoes pause the cadence                              | -     | Pending |
| COEX-09        | P1: Echoes pause the cadence                              | -     | Pending |
| COEX-10        | P1: Echoes pause the cadence                              | -     | Pending |
| COEX-11        | P1: Token refresh                                        | -     | Pending |
| COEX-12        | P1: Token refresh                                        | -     | Pending |
| COEX-13        | P1: Token refresh                                        | -     | Pending |
| COEX-14        | P1: Token refresh                                        | -     | Pending |
| COEX-15        | P2: Coex fields acknowledge 200                          | -     | Pending |
| COEX-16        | P2: Coex fields acknowledge 200                          | -     | Pending |
| COEX-17        | P2: Coex fields acknowledge 200                          | -     | Pending |

**Coverage:** 17 total. Design **invoked** — the channel-mode discriminator,
the new connect endpoint, the FB.login web flow, and the field-dispatched
parser all warrant a design pass.

---

## Success Criteria

- [ ] An e2e creates a coexistence channel account through the connect endpoint
      end-to-end (fake Meta) and posts an `smb_message_echoes` payload that
      triggers `MarkReplyUseCase`.
- [ ] A unit spec exercises the Meta plugin's `refreshCredentials` hook for
      both modes (coexistence: exchange; cloud_api: passthrough).
- [ ] `apps/api/.env.example` and `deploy/docker-compose.yml` document the
      three new env vars (`META_APP_ID`, `META_APP_SECRET`, `META_COEX_CONFIG_ID`)
      and the connect endpoint is rejected with a clear message when any is
      missing.
- [ ] `bun check` green; lint clean under CI strictness.
