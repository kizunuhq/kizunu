# Graph API endpoints — Meta WhatsApp Coexistence

Extracted verbatim from `chatwoot/chatwoot` @ `c4a6a19e9be899c96fd2c1cbb3454b56b7ef76fc`,
file [`app/services/whatsapp/facebook_api_client.rb`](https://github.com/chatwoot/chatwoot/blob/c4a6a19e9be899c96fd2c1cbb3454b56b7ef76fc/app/services/whatsapp/facebook_api_client.rb).
License: MIT. Fetched 2026-05-22.

Graph API version: substitute the kizunu-pinned version (see `apps/api/src/modules/channel/plugins/meta-whatsapp/meta-send.ts`; kizunu pins `v21.0`, Chatwoot uses `v22.0`).

## Calls

| Purpose | Method | Path | Body / params |
|---|---|---|---|
| Exchange auth code for token | `GET` | `/v{ver}/oauth/access_token` | `client_id`, `client_secret`, `code` (no `redirect_uri`) |
| Debug a token | `GET` | `/v{ver}/debug_token` | `input_token`, `access_token` |
| List phone numbers on a WABA | `GET` | `/v{ver}/{waba_id}/phone_numbers` | `access_token` |
| Read a phone number | `GET` | `/v{ver}/{phone_number_id}` | `access_token` |
| Register a phone number for Cloud API | `POST` | `/v{ver}/{phone_number_id}/register` | `messaging_product: 'whatsapp'`, `pin` |
| Subscribe app to a WABA | `POST` | `/v{ver}/{waba_id}/subscribed_apps` | (default fields) |
| Override WABA webhook callback | `POST` | `/v{ver}/{waba_id}/subscribed_apps` | `override_callback_uri`, `verify_token`, `subscribed_fields` |
| Unsubscribe the WABA webhook | `DELETE` | `/v{ver}/{waba_id}/subscribed_apps` | — |

## App-level subscription (prerequisite, not in Chatwoot's code)

Required before per-WABA `override_callback_uri` is accepted — Meta rejects with
`(#100) Before override the current callback uri, your app must be subscribed to receive messages for WhatsApp Business Account`.

| Purpose | Method | Path | Body / params |
|---|---|---|---|
| App-level subscribe to WhatsApp events | `POST` | `/v{ver}/{app_id}/subscriptions` | `object: 'whatsapp_business_account'`, `fields: 'messages'`, `callback_url`, `verify_token` |

Uses an **App Access Token** (`{app_id}|{app_secret}`), not the user/system token.
Source: `novu/apps/api/src/app/integrations/usecases/whatsapp/whatsapp-graph-api.utils.ts`
(`subscribeAppToWhatsAppEvents`), commit @ HEAD on 2026-05-22.

## Coex-specific subscribed_fields

When calling the WABA-level subscription for Coex, `subscribed_fields` should include
the Coex event types so Meta routes them to the callback:

```
['messages', 'smb_message_echoes', 'smb_app_state_sync']
```

Chatwoot ships `['messages', 'smb_message_echoes']` (see
`app/models/channel/whatsapp.rb` `disable_voice_calling!` reference, same commit);
they have not yet added `smb_app_state_sync` in production.
