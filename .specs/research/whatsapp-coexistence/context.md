# WhatsApp Coexistence — research context

> Captured 2026-05-22 for the Phase 1.8 work (`.specs/project/ROADMAP.md`).
> Refresh this doc before each Phase 1.8 feature starts — Meta's WhatsApp APIs
> shift, and any source pinned below may have changed.

## Purpose

The kizunu Meta plugin in `apps/api/src/modules/channel/plugins/meta-whatsapp/`
implements **standalone Cloud API** today: the customer pastes a System Token
plus `wabaId` / `phoneNumberId`, kizunu sends from
`graph.facebook.com/v21.0/{phoneNumberId}/messages`, and inbound webhooks parse
the standard `messages` event. There is no OAuth, no app-level subscription, no
echo handler, and no automatic webhook configuration.

Phase 1.8 closes the gap to **Coexistence** — the WhatsApp Business mobile app
stays primary, the Cloud API integration runs alongside, the customer onboards
through Meta's Embedded Signup flow, and kizunu receives both inbound replies
and echoes of messages the customer sends from the mobile app. This file is the
pre-spec source-of-truth bundle: every URL, every verified payload shape, and
every constraint we'll cite in the eventual `spec.md` / `design.md` files.

## Why this matters — the v0.1 drift

`.specs/project/ROADMAP.md:55` describes the v0.1 Meta plugin as
"Meta Cloud API **via Coexistence**". The implementation that landed
(`meta-credentials.ts` schema with `wabaId` / `phoneNumberId` / `systemToken`)
is **standalone Cloud API**, not Coex. Coex requires Embedded Signup, business
tokens (not System User tokens), per-channel verify tokens, app-level subscription,
and three Coex-specific webhook event types. None of that is in the v0.1 code.

Phase 1.8 is not a new ambition — it closes the original v0.1 contract.

## A. Canonical Meta documentation

These pages are JS-rendered and do not return content via simple HTTP fetch. To
read them: open in a browser, use the Chrome MCP, or rely on the readable
mirrors in section B.

| Topic | URL |
|---|---|
| Coex onboarding (primary) | <https://developers.facebook.com/docs/whatsapp/embedded-signup/custom-flows/onboarding-business-app-users/> |
| Embedded Signup — overview | <https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/overview/> |
| Embedded Signup v4 — current version | <https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/version-4/> |
| Embedded Signup — implementation | <https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/implementation/> |
| Embedded Signup — errors | <https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/errors/> |
| Webhook reference — `smb_message_echoes` | <https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/smb_message_echoes> |
| Webhook reference — `smb_app_state_sync` | <https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/reference/smb_app_state_sync/> |
| Cloud API — webhooks overview | <https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks> |

**Critical timeline:** Embedded Signup **v2 deprecates 2026-10-15**. Today's
date is 2026-05-22 — under five months runway. Phase 1.8 must build v4
from the start. No v2 fallback.

## B. Readable mirrors (good content, fetchable)

Useful when the canonical pages above can't be read in-context.

| Source | What it covers | URL |
|---|---|---|
| 360dialog — Coex partner docs | Customer constraints (OBA unsupported, max 4 companion devices, no WABA migration), webhook overview | <https://docs.360dialog.com/partner/waba-management/whatsapp-coexistence> |
| 360dialog — Coex client docs | The customer-facing constraints same as above; the 13-day open requirement is quoted here | <https://docs.360dialog.com/docs/waba-management/the-360-client-hub/embedded-signup/whatsapp-coexistence> |
| 360dialog — Coex webhooks | The three webhook fields with prose descriptions | <https://docs.360dialog.com/partner/waba-management/whatsapp-coexistence/coexistence-webhooks> |
| `vobase/vobase` — Claude-skill reference | Distilled Coex constraints; gives the 14-day figure (vs 360dialog's 13), the v2.24.17+ WA Business app version, region exclusions | <https://github.com/vobase/vobase/blob/86d8fd882aa6166113eefe2ff0b3b053315ff3ca/.claude/skills/whatsapp-cloud-api/references/coexistence.md> |
| `yvfl/api-whatsapp-docs` (PT-BR) | Meta docs mirror in Portuguese, including `smb_app_state_sync.md` and `smb_message_echoes.md` | <https://github.com/yvfl/api-whatsapp-docs> |
| `positusapps/quick-docs` | Verbatim sample payloads (a Coex `smb_app_state_sync` JSON is captured in `snippets/`) | <https://github.com/positusapps/quick-docs> |

## C. Open-source reference implementations

These are working Coex code we have read end-to-end. Use them as both a worked
example for kizunu's spec **and** a reality check on Meta's docs (the docs are
often less precise than the OSS code that has to actually pass Meta's tests).

| Repo | Status | Files to read | Notes |
|---|---|---|---|
| [chatwoot/chatwoot](https://github.com/chatwoot/chatwoot/tree/c4a6a19e9be899c96fd2c1cbb3454b56b7ef76fc) | Partial Coex: echoes shipped, contact sync + history deferred | `app/javascript/.../whatsapp/utils.js` (Coex `FB.login`), `app/jobs/webhooks/whatsapp_events_job.rb` (routes `smb_message_echoes`), `app/services/whatsapp/facebook_api_client.rb` (Graph API surface), `app/services/whatsapp/webhook_setup_service.rb` (WABA subscription), `app/services/whatsapp/token_validation_service.rb` (debug_token + WABA cross-check), `app/services/whatsapp/embedded_signup_service.rb` (orchestrator), `app/services/whatsapp/token_exchange_service.rb` (code → token), `app/models/channel/whatsapp.rb`, `spec/jobs/webhooks/whatsapp_events_job_spec.rb` (test fixture) | Most complete Coex foundation in OSS. The single biggest signal: their `FB.login` extras object — see `snippets/fb-login-coex.js`. No app-level subscription in code (assumed pre-configured). |
| [evolution-foundation/evo-ai-crm-community](https://github.com/evolution-foundation/evo-ai-crm-community/tree/8d7bf198072fded000dd8c49c257097ed00ce554) (Chatwoot fork) | Ships the `smb_app_state_sync` handler Chatwoot deferred | `app/services/whatsapp/contact_sync_service.rb` | Reads `value.state_sync[]`; `'add'` upserts contact, `'remove'` flags `whatsapp_contact_removed: true` (does NOT delete — preserves conversation history) |
| [fbsamples/business-messaging-sample-tech-provider-app](https://github.com/fbsamples/business-messaging-sample-tech-provider-app/tree/0f747a324c005e83f84e3a0bb2523bbb6d617462) | Meta-authored skeleton, MIT | `app/components/Fbl4bLauncher.tsx` (FBL4B popup orchestration), `app/publicConfig.ts` (configuration metadata, including the feature-to-version map) | Useful for the popup lifecycle pattern (postMessage, window-close polling, token persistence); FB.login config is parameterized via prop, not embedded |
| [novu/novu](https://github.com/novuhq/novu) (analyzed in earlier session) | **No Coex.** Cloud API only | `apps/api/src/app/integrations/usecases/whatsapp/whatsapp-graph-api.utils.ts` (`subscribeAppToWhatsAppEvents`, `subscribeWabaMessagesField`, `debugAccessToken`, `extractMetaError`, `flattenScopes`), `whatsapp-validate-token.usecase.ts` (thorough token validation with WABA-phone cross-check), `whatsapp-credentials.utils.ts` (`ensureWhatsAppManagedCredentials` — auto-generates per-channel verify token) | Source of the auto-subscribe pattern feature 029 will steal. Coex itself absent. |

**Gap discovered:** no surveyed OSS project ships **all three** Coex webhook
handlers (`smb_message_echoes` + `smb_app_state_sync` + `history`) in production.
Chatwoot has echoes; evo-ai-crm fork has contact sync. History sync is universally
either deferred or absent. Phase 1.8 feature 031 will be one of the first
end-to-end OSS Coex implementations.

## D. Verified facts (verbatim where possible)

### D.1 Embedded Signup launch — Coex flag

The single Coex differentiator is the `extras` object passed to `FB.login`:

```js
extras: {
  setup: {},
  featureType: 'whatsapp_business_app_onboarding',  // Coex switch (camelCase)
  sessionInfoVersion: '3',
}
```

Source: `snippets/fb-login-coex.js` (extracted from `chatwoot/chatwoot` @
`c4a6a19e9be899c96fd2c1cbb3454b56b7ef76fc`, MIT).

For **standard Cloud API** (non-Coex) the `featureType` value differs (Meta's
docs name it `whatsapp_business`); confirm in Meta's current Embedded Signup v4
reference before implementing the non-Coex branch — kizunu's primary need is
Coex but a future second pilot may want migrated Cloud API.

### D.2 Callback completion events

The popup posts back via `window.postMessage` from `*.facebook.com` origins.
Validate `event.origin.endsWith('facebook.com')` before trusting the payload.

Parsed shape: `{ type: 'WA_EMBEDDED_SIGNUP', event, data: { business_id, waba_id, phone_number_id }, ... }`.

Distinguishing completion events:

- `FINISH` — standard Cloud API onboarding succeeded
- `FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING` — **Coex onboarding succeeded**
- `CANCEL` — user dismissed
- `error` — failed (payload carries `error_message`, `error_id`, `session_id`)

The server can infer "this is a Coex link" from the `event` value alone; no
separate flag is needed in the request body. (Chatwoot's controller, in fact,
accepts only `code`, `business_id`, `waba_id`, `phone_number_id`.)

### D.3 OAuth code → business token

```
GET /v{ver}/oauth/access_token?client_id={appId}&client_secret={appSecret}&code={code}
```

Returns `{ access_token, token_type, expires_in }`. **No `redirect_uri` param.**
Source: Chatwoot's `FacebookApiClient#exchange_code_for_token`.

The returned token is a **business token** (not a System User token); it expires
(default ~60 days) and is refreshable via the long-lived-token exchange. Storing
`accessTokenExpiresAt` alongside the token is mandatory.

### D.4 App + WABA webhook subscription (two-call sequence)

App-level subscription must succeed **before** the per-WABA override. Without
it, Meta rejects the WABA call with error `(#100) Before override the current
callback uri, your app must be subscribed to receive messages for WhatsApp
Business Account`.

**Step 1 — app-level (uses App Access Token `{appId}|{appSecret}`):**

```
POST /v{ver}/{appId}/subscriptions
  object=whatsapp_business_account
  fields=messages
  callback_url={publicHttpsUrl}
  verify_token={kizunuVerifyToken}
```

One-time per kizunu deploy. Cache the success result.

**Step 2 — per-WABA (uses the customer's business token):**

```
POST /v{ver}/{wabaId}/subscribed_apps
  override_callback_uri={publicHttpsUrl}
  verify_token={perChannelVerifyToken}
  subscribed_fields=messages,smb_message_echoes,smb_app_state_sync
```

`subscribed_fields` for Coex must include `smb_message_echoes` (echoes from the
mobile app) and `smb_app_state_sync` (contact list sync). Chatwoot currently
ships only `['messages', 'smb_message_echoes']`; for feature 031 we'll subscribe
all three.

### D.5 Webhook payload shapes (verbatim)

- `smb_message_echoes` — `snippets/smb-message-echoes-payload.json`. Inner array
  is `message_echoes` (NOT `messages`). Each echo has `from` (business owner),
  `to` (customer, no `+` prefix), `to_user_id`, `to_parent_user_id`, `id` (wamid
  for dedup), `type`, and the typed body (`text`/`image`/etc.).
- `smb_app_state_sync` — `snippets/smb-app-state-sync-payload.json`. Inner array
  is `state_sync`. Each item: `type` (`contact`), `action` (`'add'` | `'remove'`),
  `contact` (`phone_number`, `full_name`, `first_name`), `metadata.timestamp`.
- `history` — sample not in `snippets/` (no OSS project we surveyed handles it
  in production). The 360dialog docs describe it as a backfill stream of past
  messages, sent in the minutes after onboarding succeeds, capped at ~6 months,
  1:1 chats only.

### D.6 Graph API surface

See `snippets/graph-api-endpoints.md` for the full table of endpoints, methods,
and bodies — extracted from `chatwoot/chatwoot/app/services/whatsapp/facebook_api_client.rb`
plus the app-level subscription from novu.

Key call kizunu does **not** make in Cloud-API-only mode and will need to add
for Coex: **phone number registration is SKIPPED in Coex** (Meta handles it
during Embedded Signup). For migrated-Cloud-API onboarding, a `POST
/{phone_number_id}/register` with `pin` is required. The branch is on whether
the callback event was `FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING` (skip) or
`FINISH` (call register).

## E. Customer + Meta constraints

These rules apply to the customer's number and the kizunu deployment.

### E.1 Customer prerequisites

- WhatsApp Business mobile app version **v2.24.17+** (vobase reference;
  360dialog phrases it as "supported version" without a number — confirm
  against Meta's current Coex page before pilot).
- Minimum **7 days** of active WA Business app usage before the customer is
  eligible for Coex onboarding.
- The number must NOT already be linked to another Cloud API integration on
  another Meta App. Coex slots are 1:1 per number per Meta App. If previously
  paired, the customer must unlink in **WA Business app → Settings → Linked Devices**
  before onboarding to kizunu.
- The customer must NOT have **two-factor authentication** enabled on the
  number at onboarding time — confirm against Meta's current requirements.

### E.2 Customer ongoing obligations

- Do NOT uninstall the WhatsApp Business app — uninstalling disconnects the
  Coex link.
- Open the WA Business app at least every **13–14 days** or the link drops
  (sources vary: 360dialog says 13, vobase says 14 — treat as "open weekly to
  be safe" and surface in the pilot's onboarding instructions).
- Up to **4 linked companion devices** are allowed. Messages from Windows /
  WearOS companions silently **fail to sync** to the Cloud API — be aware in
  the pilot conversation review.

### E.3 Meta constraints on Coex (Phase 1 GA, early 2025)

- **1-to-1 messaging only.** No group chats. No calls (Phase 1).
- Contact sync is **one-way: app → Cloud API**. Contacts added in kizunu do
  NOT push back to the customer's mobile app.
- History import: last **6 months**, 1:1 only. Attachments may be partial.
- **Disappearing messages, view-once, message editing** — all disabled while
  on Coex.
- **Broadcast lists** become read-only.
- **Official Business Account (OBA / blue tick)** is NOT supported on Coex.
- **Migration between WABAs** is NOT supported (cannot transfer a Coex link
  from one WABA to another).
- **Display name** is NOT auto-reviewed on Coex (manual review path only).
- **Unsupported regions** as of March 2026: Nigeria, South Africa.

### E.4 Critical semantic for kizunu's engine

**Echoes do NOT open a 24-hour service window.**

When the customer sends a message from the WA Business mobile app, kizunu
receives an `smb_message_echoes` event. But Meta does **not** count this as
the start of a service-window: kizunu still cannot send freeform messages
to that customer until the *customer* replies *to* the business. This
matters for `MetaWhatsappPlugin.validate()` in `meta-whatsapp.plugin.ts:41` —
the `lastInboundAt` semantic must distinguish:

- Real inbound from customer (opens 24h freeform window)
- Echo of outbound from business mobile app (informational only, does NOT
  open the window)

Failing this distinction would cause kizunu to send a freeform message it
isn't allowed to send, and Meta would reject with `131047` (re-engagement
required) or `131051` (unsupported message type). 360dialog explicitly calls
this out: "Message echoes do not open service windows or trigger automations."

### E.5 Disconnection

User-initiated only, via **WA Business app → Settings → Account → Business
Platform → Disconnect**. There is no kizunu-initiated unlink — the customer
controls the lifecycle. Kizunu's webhook will simply stop receiving events;
detection requires a heartbeat (e.g. periodic `GET /{phone_number_id}` and
flagging the channel inactive on 404 / unauthorized).

## F. Gaps and open questions

To resolve before or during the pilot:

1. **Exact WA Business app minimum version.** Pin against Meta's current Coex
   onboarding page; vobase says v2.24.17+, others are vague.
2. **2FA state** at onboarding time — confirm Meta's current requirement.
3. **`smb_app_state_sync` action vocabulary** beyond `'add'` and `'remove'` —
   evo-ai-crm logs unknown actions as warnings; verify against Meta's current
   docs whether there are additional action types (e.g. `update`, `block`).
4. **`history` webhook shape** — no OSS production reference. Need to inspect
   live during the first Coex onboarding, or find Meta's reference docs and
   read in browser.
5. **Token refresh window.** Business tokens nominally last ~60 days; Meta's
   long-lived-token endpoint specifics for business tokens (not user tokens)
   need confirming.
6. **Coex region restrictions on the customer's pilot region.** Confirm not
   Nigeria/South Africa for the pilot.
7. **Phone-number-registration skip semantics** — verify with Meta's current
   docs that Coex onboarding does in fact register the number on the customer's
   behalf (so kizunu should NOT call `/{phone_number_id}/register`).

## G. Implementation notes for the eventual specs

Things the Phase 1.8 specs will need to anchor on this doc:

- **OAuth credential lifecycle is a shared concern**, not Meta-specific. The
  spec for feature 030 will extract a small `oauthCredentialFields` mixin and
  an `OAuthRefreshService`. Cite section D.3 (token has expiry, refresh
  required) as the driving constraint.
- **App-level secrets (`appId`, `appSecret`, `coexConfigId`) are kizunu-wide**,
  not per-channel-account. Cite section D.4 (app-level subscription runs once
  per deploy with the App Access Token). These go in `apps/api/src/config/`,
  injected via `ConfigService`.
- **Per-channel verify tokens replace the env-wide one**. Cite section D.4
  (the per-WABA `override_callback_uri` call carries a `verify_token` we
  generate per channel account). Today kizunu uses a single `META_VERIFY_TOKEN`
  config value — that's fine for one customer, fails for many.
- **Echoes ≠ replies** for the service-window. Cite section E.4. The engine's
  `MarkReplyUseCase` must accept echoes as conversation-state signals but
  must NOT advance `lastInboundAt` for the freeform window calculation.
- **Build Embedded Signup v4 from day one.** Cite section A (v2 deprecates
  2026-10-15). Do not write v2/v3 compatibility paths.

## Glossary

- **Coex / Coexistence** — Meta's product letting one WhatsApp number be used
  simultaneously from the WhatsApp Business mobile app and the Cloud API. The
  mobile app stays primary; the Cloud API is the companion.
- **Embedded Signup** — the OAuth-style flow inside Meta's Facebook Login for
  Business JS SDK that lets a business grant a Tech Provider's app access to
  their WABA in a few clicks. Two flavors: standard (number migrates to Cloud
  API, mobile app stops working) vs Coex (mobile app stays primary).
- **Tech Provider** — a role granted by Meta on a verified business so other
  businesses can connect their WABAs to that provider's Cloud API integration.
  Required to use Embedded Signup with external customers.
- **FBL4B** — Facebook Login for Business, the JS SDK product that embeds the
  OAuth popup. The newer label for what used to be plain Facebook Login.
- **WABA** — WhatsApp Business Account, the Meta-side entity that owns one or
  more phone numbers and the templates registered against them.
- **System Token** — the legacy auth path: a System User in Business Manager
  generates a long-lived token. What kizunu uses today for its standalone Cloud
  API plugin. Coex uses **business tokens** from the OAuth exchange instead.
- **Service window** — Meta's 24-hour conversation policy: after a customer
  sends an inbound message, the business can send freeform messages for 24
  hours. Outside the window, only pre-approved template messages are allowed.
- **Echo** — a webhook event delivered to the Cloud API for messages the
  business sends from the WhatsApp Business mobile app. Lets the API mirror
  the conversation but does NOT open a service window.
