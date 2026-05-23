# Snippets — verbatim source material

These files are direct extracts from external open-source projects, captured on
2026-05-22 and pinned to immutable commits. They exist so the research and the
future feature specs can quote a stable artifact without depending on a moving
branch.

When updating any snippet:

1. Re-fetch from the source's current HEAD.
2. Bump the commit SHA in the file's header (or in this README's table).
3. Note what changed in a one-line comment so reviewers can diff intent vs drift.

## Inventory

| File | Source | Commit pinned | License | Why |
|---|---|---|---|---|
| `fb-login-coex.js` | [chatwoot/chatwoot — `app/javascript/.../whatsapp/utils.js`](https://github.com/chatwoot/chatwoot/blob/c4a6a19e9be899c96fd2c1cbb3454b56b7ef76fc/app/javascript/dashboard/routes/dashboard/settings/inbox/channels/whatsapp/utils.js) | `c4a6a19e9be899c96fd2c1cbb3454b56b7ef76fc` | MIT | Reference `FB.login` call with the Coex `featureType` switch — the single most undocumented-by-Meta detail |
| `smb-message-echoes-payload.json` | [chatwoot/chatwoot — `spec/jobs/webhooks/whatsapp_events_job_spec.rb`](https://github.com/chatwoot/chatwoot/blob/c4a6a19e9be899c96fd2c1cbb3454b56b7ef76fc/spec/jobs/webhooks/whatsapp_events_job_spec.rb) test fixture | `c4a6a19e9be899c96fd2c1cbb3454b56b7ef76fc` | MIT | Verbatim webhook shape for inbound echoes from the WA Business app |
| `smb-app-state-sync-payload.json` | [positusapps/quick-docs — `coex/sync/contacts/json/payload.json`](https://github.com/positusapps/quick-docs/blob/89228120eab7d73700906ed3d452dc822dbbe782/coex/sync/contacts/json/payload.json) | `89228120eab7d73700906ed3d452dc822dbbe782` | (repo carries no LICENSE; payload is a re-publication of Meta's webhook schema) | Verbatim sample of the contact-sync webhook |
| `graph-api-endpoints.md` | [chatwoot/chatwoot — `app/services/whatsapp/facebook_api_client.rb`](https://github.com/chatwoot/chatwoot/blob/c4a6a19e9be899c96fd2c1cbb3454b56b7ef76fc/app/services/whatsapp/facebook_api_client.rb) + novu (HEAD 2026-05-22) | as above | MIT | Distilled list of every Graph API call the Coex flow needs |

Use the parent [`context.md`](../context.md) for the synthesized story; come here
only when a spec needs to quote the exact wire shape.
