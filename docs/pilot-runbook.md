# Pilot runbook & customer handoff

> Customer-facing setup + operating procedure for the kizunu Phase 2.1 v1.0
> pilot. Feature `083` of Phase 2.1.

This runbook is the handoff document. An operator follows it once at
pilot start and references the recovery sections during the pilot.

## Pre-flight checklist (do this before kicking off setup)

1. **Meta WhatsApp Business prereqs** (feature `031` notes):
   - WA Business app v2.24.17+ installed on the BDR's phone.
   - Minimum 7 days of active app usage.
   - The phone number is not already linked to another Cloud API integration.
   - The account is not in Nigeria or South Africa (unsupported as of 2026-03).
2. **Pipedrive prereqs**:
   - Admin (or "API user") seat with API access enabled.
   - Stage(s) you will use for the cadence are created.
3. **Templates approved by Meta**:
   - At least one HSM template (text-only is fine for the pilot) is in `APPROVED` status.

## Setup procedure (10–20 minutes)

Walk the operator through `https://<your-pilot>/setup`:

1. **Connect Pipedrive** — paste the API token only. The backend derives
   the company domain via Pipedrive's `/v1/users/me`. The form is one
   secret + one optional override under Advanced settings (feature `059`).
2. **Connect WhatsApp** — for Coex, click "Connect" and complete the
   Facebook Embedded Signup; the row is auto-created with the verify
   token already wired. For Cloud API, paste WABA + Phone Number + System
   Token in the New channel dialog.
3. **Map BDR routing** — at `/settings/members`, every active member must
   have access to a primary WhatsApp channel. The "Routing readiness"
   card shows Ready / Missing primary / No channel access (feature `062`).
4. **Create templates** — at `/workspace/cadences` → "New template". Pick
   the Meta template from the dropdown (the directory picker from feature `054`).
5. **Create cadence** — at `/workspace/cadences` → "New cadence". Order
   the steps (touch 1 at day 0, touch 2 at day +2, …) and pick which
   template each step sends. Set `onReply` → `move_stage` if you want
   the reply to advance the deal in Pipedrive.
6. **Set entry trigger** — at `/settings/connectors` → "Add entry
   trigger". Pick the pipeline + stage that should start the cadence;
   choose the cadence.

## Coex upkeep (15-day cycle)

Coex tokens expire every 60 days but Meta's recommendation is to
refresh within a 14-day window. The `OAuthRefreshService` from feature
`030` auto-refreshes whenever `accessTokenExpiresAt` is within 5
minutes. If the refresh fails (Meta returned an error) the channel
health pill (feature `061`) flips to amber/red — the operator must
re-run the Embedded Signup. **Schedule:** check `/setup` once a week
during the pilot.

## Pipedrive webhook setup

After step 1 of setup, copy the displayed webhook URL from
`/settings/connectors` → connector row. In Pipedrive:

1. Settings → Tools → Webhooks → Add.
2. Event: `deal.updated`.
3. URL: paste the kizunu webhook URL (it already carries the per-account
   token from feature `053`).
4. Save.

## Operating procedure

### Daily

- Check `/workspace` for the dashboard summary.
- Skim `/workspace/journeys?status=error_state` for blocked journeys.
  Each row's "Error reason" links straight to the settings page that owns
  the fix (feature `072`).

### Weekly

- Re-run `/setup` → verify the readiness banner is green (feature `067`).
- Check `/settings/channels` health pills (feature `061`).
- Check `/settings/connectors` health pills (feature `060`).

### On-incident

| Symptom | Where to look | Likely fix |
| --- | --- | --- |
| Journey in `error_state` with reason `no_channel` | `/settings/channels` → confirm primary set | Grant access + mark primary |
| Journey in `error_state` with reason `owner_not_mapped` | `/settings/connectors` → member identities | Manually map the Pipedrive user to a member |
| Journey in `error_state` with reason `template_required` | `/workspace/cadences` → cadence | Pick a template for the step |
| All journeys stuck | `/settings/channels` health pill = unreachable | Meta token rejected — reconnect Coex / paste new System Token |

## Launch (D-Day)

1. Verify `/setup` banner reads "All systems ready".
2. Move a single test deal into the trigger stage in Pipedrive; verify
   the journey appears as `running` at `/workspace/journeys`.
3. Wait for the first touch to actually send (check the BDR's phone).
4. If the BDR replies, verify the journey transitions to `replied` and
   the `onReply` action fires (e.g. stage moved in Pipedrive).
5. Roll out to the full pilot cohort.

## Rollback

If the pilot needs to be paused mid-flight, the cleanest control today
is to **remove the entry trigger** in Pipedrive (delete the webhook).
New deals will stop ingesting; running journeys complete naturally. A
workspace-level emergency stop is tracked separately (feature `075`).
