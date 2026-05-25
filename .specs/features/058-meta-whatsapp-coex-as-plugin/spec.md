# WhatsApp Coex as a second channel plugin — Specification

**Feature**: 058-meta-whatsapp-coex-as-plugin
**Status**: Draft

---

## Problem Statement

Today the Meta WhatsApp integration ships two onboarding shapes (operator-paste
Cloud API and OAuth-driven Embedded Signup / "Coex"), but only one of them —
the Cloud API path — is discoverable from Settings → Channels. Coex lives on
its own route at `/workspace/connect-meta-coex` and is invisible to operators
who don't already know it exists. The plugin picker in the New Channel dialog
lists exactly one entry, `meta-whatsapp`, because Coex is not a registered
plugin: it's a parallel use case (`ConnectMetaCoexUseCase`) that writes
`channelMode: 'coexistence'` rows under the same `pluginId`.

The result is a discoverability gap (operators ask "where is Coex?"), and the
plugin architecture leaks: a single plugin id maps to two semantically
different onboarding paths and credential shapes, which has already produced
discriminator-based branching across `refreshCredentials`, the stored
schema's discriminated union, and the connect endpoint sitting outside the
plugin contract.

## Goals

- [ ] Coex appears in the `useChannelPlugins()` picker as its own entry
      ("WhatsApp (Coex / Embedded Signup)") alongside Cloud API.
- [ ] Selecting the Coex entry inside the Add Channel Account dialog swaps the
      credentials form for the existing FB Login + WABA/phone-number panel,
      reusing `ConnectMetaCoexUseCase` end-to-end with no parallel API
      surface for operators to learn.
- [ ] The plugin contract grows a single, typed extension point
      (`manifest.connect`) describing whether a plugin is credentials-shaped
      or OAuth-shaped, so the web client can branch deterministically without
      hard-coded plugin id checks.
- [ ] Already-stored coexistence channel accounts (rows with
      `pluginId='meta-whatsapp'` + `channelMode='coexistence'`) keep working
      after the change — send, parseInbound, directory, refresh, dispatch by
      plugin id all continue to resolve correctly.
- [ ] Definition of Done per AGENTS.md: `bun check` green (all gates),
      `thermo-nuclear-code-quality-review` raises nothing structural, every
      acceptance criterion below is covered by a test or an e2e flow
      (`generate-tests` decides the level).

## Out of Scope

| Feature | Reason |
| --- | --- |
| Generalizing the connect endpoint to a provider-agnostic OAuth handler | Only one provider has OAuth today; premature abstraction. The endpoint stays Meta-specific and is renamed/co-located if needed. |
| Narrowing `metaCredentialsSchema` from discriminated union to `cloud_api`-only after the migration | Safer to ship the split first and prune the union in a follow-up; out of this feature's blast radius. |
| Deleting the standalone `/workspace/connect-meta-coex` page | Keep as a deep-link target for now. Removing requires updating any operator bookmarks/docs; do as a separate cleanup. |
| Frontend env var → server-config migration for `VITE_META_APP_ID` / `VITE_META_COEX_CONFIG_ID` | These remain build-time env on the web. A `/me`-style discovery endpoint is a separate concern. |
| Telegram, email, SMS OAuth plugins | The `connect: { kind: 'oauth', provider: 'meta-coex' }` descriptor reserves room for future providers but adding them is out of scope. |
| Multi-WABA / multi-phone selection inside the dialog | Same single-WABA flow as today; UX parity, not an enhancement. |

---

## User Stories

### P1: Coex shows up in the picker ⭐ MVP

**User Story**: As an operator opening "Add channel account", I want to see
"WhatsApp (Coex / Embedded Signup)" as a selectable plugin so I can connect a
shared-number WhatsApp Business account without leaving Settings → Channels
or knowing about a hidden route.

**Why P1**: This is the visible bug the user reported. Without it the feature
is not delivered.

**Acceptance Criteria**:

1. WHEN the operator opens the New Channel dialog AND a Meta App ID +
   Coex Config ID are configured for the deployment THEN the picker SHALL
   list both `meta-whatsapp` (Cloud API) and `meta-whatsapp-coex`
   (Coex / Embedded Signup) entries.
2. WHEN the operator opens the New Channel dialog AND any of `META_APP_ID`,
   `META_APP_SECRET`, `META_COEX_CONFIG_ID` is missing on the server THEN
   the picker SHALL still list the Coex entry but selecting it SHALL
   surface a clear "WhatsApp Coex isn't configured for this deployment"
   message and SHALL NOT load the FB SDK or attempt the OAuth flow.
3. WHEN the operator submits the `GET /channel-plugins` request THEN the
   response SHALL include each plugin's `connect` descriptor
   (`{ kind: 'credentials' }` for `meta-whatsapp`, `{ kind: 'oauth',
   provider: 'meta-coex' }` for `meta-whatsapp-coex`) and the web client
   SHALL branch the dialog body on that descriptor — no hard-coded plugin
   id check.

**Independent Test**: hit the API directly (`GET /channel-plugins`) and
verify two plugins are listed with the right `connect` descriptors; open
the dialog in the browser and verify both entries appear; verify the
Cloud API entry still shows the existing credentials form.

---

### P1: Selecting Coex runs the Embedded Signup flow inline ⭐ MVP

**User Story**: As an operator who picked "WhatsApp (Coex)" in the dialog,
I want the dialog to host the FB Login button and the WABA/phone-number
capture step so I can complete the connect without bouncing to a separate
page.

**Why P1**: The picker entry is only useful if it actually drives the
existing OAuth flow. Bouncing the operator out of the dialog defeats the
discoverability goal.

**Acceptance Criteria**:

1. WHEN the operator picks the Coex plugin in the dialog THEN the dialog
   body SHALL render the Coex OAuth panel (existing `ConnectMetaCoex`
   component or a thin equivalent) including the Facebook Login button,
   the "Finish connect" button, the channel-name input, and the status
   line, replacing the credentials form.
2. WHEN the operator completes Embedded Signup AND submits "Finish
   connect" THEN the dialog SHALL POST to the existing
   `POST /workspaces/:workspaceId/channel-accounts/meta-whatsapp/connect`
   endpoint via the existing `useConnectMetaCoex` hook, with no new HTTP
   contract.
3. WHEN the connect call succeeds THEN the dialog SHALL close, the
   channel accounts table SHALL invalidate so the new row appears, and a
   success toast ("Channel account added") SHALL display, matching the
   Cloud API path's UX.
4. WHEN the connect call fails (Meta returns an error, the WABA
   subscription fails, the operator-supplied IDs are invalid) THEN the
   dialog SHALL show the error via the standard `FormError` surface
   (same component as the Cloud API form) and keep the dialog open.
5. WHEN the dialog is open and a Coex OAuth flow is in flight THEN the
   dialog Cancel/close buttons SHALL be disabled until the flow either
   completes or errors, mirroring `isPending` behavior in other dialogs.
6. WHEN the operator opens the dialog and the picker has Coex selected
   THEN the standard "Add channel account" submit button in the dialog
   footer SHALL be replaced/hidden in favor of the OAuth panel's own
   "Finish connect" button (the dialog must NOT show two competing submit
   buttons).

**Independent Test**: open the dialog in Chrome, pick Coex, walk through
the FB Login → postMessage → Finish connect flow against a sandboxed Meta
app, verify the row is created with `pluginId='meta-whatsapp-coex'` and
`channelMode='coexistence'`, and verify the new row shows up in the
channel accounts table without a page reload.

---

### P1: Existing Coex rows keep working ⭐ MVP

**User Story**: As a workspace owner who already connected Coex before
058 ships, I want my channel account to keep sending/receiving WhatsApp
messages with no manual intervention after the upgrade.

**Why P1**: Breaking installed Coex rows is unacceptable; the feature
must ship with a migration or a runtime compat layer.

**Acceptance Criteria**:

1. WHEN the API boots after this feature is deployed THEN every existing
   `channelAccounts` row whose stored credentials carry
   `channelMode='coexistence'` SHALL have `pluginId='meta-whatsapp-coex'`
   (achieved by a one-shot Drizzle migration generated via
   `bun db:generate`, never hand-edited).
2. WHEN the engine, sender, webhook receiver, or directory dispatcher
   resolves a plugin by `pluginId` on a migrated row THEN the registry
   SHALL return the `meta-whatsapp-coex` plugin and its
   `send`/`parseInbound`/`directory`/`refreshCredentials` SHALL produce
   the same observable behavior as before the change for the same
   credentials.
3. WHEN a new Cloud API channel is created post-migration THEN it SHALL
   be written with `pluginId='meta-whatsapp'`; WHEN a new Coex channel is
   created post-migration THEN it SHALL be written with
   `pluginId='meta-whatsapp-coex'`. Neither path writes the other id.
4. WHEN `bun db:test:setup` runs the migration against an empty schema
   THEN it SHALL succeed (idempotent migration that is a no-op when no
   coexistence rows exist).

**Independent Test**: integration spec that inserts a synthetic
coexistence row pre-migration, runs the migration, then asserts the row's
`pluginId` flipped and that the registry resolves the new id; e2e spec
that sends a message via a migrated row and exercises the directory
lookup.

---

### P2: Re-route the standalone Coex page to the dialog

**User Story**: As an operator who bookmarked
`/workspace/connect-meta-coex`, I want the page to either still work or
redirect me to the new in-dialog flow so my muscle memory doesn't break.

**Why P2**: Discoverability nice-to-have; the dialog is the new primary
entry but the old page is documented in the research bundle and likely
in some operator notes. A redirect (or a slim wrapper that opens the
settings dialog with Coex preselected) avoids breakage.

**Acceptance Criteria**:

1. WHEN the operator visits `/workspace/connect-meta-coex` THEN the page
   SHALL either (a) navigate to `/settings/channels?addCoex=1` and
   auto-open the dialog with Coex preselected, OR (b) keep working as
   today with a one-line banner pointing to the new location. Choice
   between (a) and (b) deferred to design.

**Independent Test**: open the URL; verify the operator lands on the
new flow without a 404 or a dead button.

---

## Edge Cases

- WHEN the server-side Meta config is incomplete (any of `meta.appId`,
  `meta.appSecret`, `meta.coexConfigId` missing) AND an operator selects the
  Coex plugin in the dialog THEN the dialog SHALL render the OAuth panel in
  a disabled state with a "WhatsApp Coex is not configured for this
  deployment. Ask your administrator to set META_APP_ID, META_APP_SECRET,
  and META_COEX_CONFIG_ID." message and SHALL NOT load the FB JS SDK.
  (The server already throws `MetaCoexNotConfiguredException`; the dialog
  must surface it pre-flight rather than after the user clicks "Connect".)
- WHEN the FB JS SDK fails to load (network/blocker) THEN the OAuth panel
  SHALL surface "Facebook SDK not loaded yet" in the status line and the
  "Connect WhatsApp Business" button SHALL stay enabled to allow a retry.
- WHEN the operator picks Coex, partially completes Embedded Signup, then
  switches the picker back to Cloud API THEN the dialog SHALL reset the
  partial Coex state (clear `code`, `wabaId`, etc.) so a subsequent Cloud
  API submit doesn't carry stale OAuth state. (Already handled by the
  `key={pluginId}` re-mount pattern in `ChannelAccountForm` if we extend it
  to wrap the OAuth panel too.)
- WHEN two operators in the same workspace open the dialog and one creates
  a Coex account THEN the other's open dialog SHALL NOT crash on the
  invalidated query; standard TanStack Query invalidation behavior applies.
- WHEN the migration runs against a row whose `credentials` JSON does not
  parse against the coexistence schema (corrupt data) THEN the migration
  SHALL leave that row's `pluginId` untouched and log a warning rather
  than fail the whole migration. Out-of-band cleanup is the operator's
  job; the migration is best-effort row-by-row.
- WHEN the OAuth flow succeeds at Meta but the per-WABA `subscribed_apps`
  call inside `finalizeMetaCoexConnection` fails THEN the API SHALL NOT
  persist a half-connected row (current behavior — preserve it).

---

## Requirement Traceability

| Requirement ID | Story                          | Phase  | Status  |
| -------------- | ------------------------------ | ------ | ------- |
| COEX-01        | P1: Coex shows up in picker    | Design | Pending |
| COEX-02        | P1: Coex shows up in picker    | Design | Pending |
| COEX-03        | P1: Coex shows up in picker    | Design | Pending |
| COEX-04        | P1: Selecting Coex runs OAuth  | Design | Pending |
| COEX-05        | P1: Selecting Coex runs OAuth  | Design | Pending |
| COEX-06        | P1: Selecting Coex runs OAuth  | Design | Pending |
| COEX-07        | P1: Selecting Coex runs OAuth  | Design | Pending |
| COEX-08        | P1: Selecting Coex runs OAuth  | Design | Pending |
| COEX-09        | P1: Selecting Coex runs OAuth  | Design | Pending |
| COEX-10        | P1: Existing Coex rows work    | Design | Pending |
| COEX-11        | P1: Existing Coex rows work    | Design | Pending |
| COEX-12        | P1: Existing Coex rows work    | Design | Pending |
| COEX-13        | P1: Existing Coex rows work    | Design | Pending |
| COEX-14        | P2: Re-route standalone page   | Design | Pending |
| COEX-15        | Edge cases (config missing)    | Design | Pending |
| COEX-16        | Edge cases (FB SDK failure)    | Design | Pending |
| COEX-17        | Edge cases (picker switch reset) | Design | Pending |
| COEX-18        | Edge cases (corrupt row in migration) | Design | Pending |

**ID format:** `COEX-NN`
**Status values:** Pending → In Design → In Tasks → Implementing → Verified
**Coverage:** 18 total, 0 mapped to tasks yet, 18 unmapped ⚠️ (resolved in tasks.md)

---

## Design Tension to Resolve in design.md

The current `ChannelPluginManifest` describes one onboarding shape:
operator pastes credentials → web renders form from `credentialFields` →
API validates with `inputSchema` → `onAccountCreated` finalizes. Coex
does not fit this:

- Inputs are not typeable into a form (FB OAuth code, business id,
  WABA id, phone number id) — they come from a postMessage on a
  Facebook-owned domain.
- The connect path runs through `POST /channel-accounts/meta-whatsapp/connect`,
  not through `POST /channel-accounts` + `validateCredentials` +
  `onAccountCreated`.
- The web needs out-of-band data (Facebook App ID, Coex config ID) to
  initialize the FB SDK.

The design phase must pick one of:

- **(A) Add `connect` descriptor to the manifest** (preferred direction):
  `manifest.connect: { kind: 'credentials' } | { kind: 'oauth', provider:
  'meta-coex' }`. The plugin listing response carries this; the web
  branches on `kind`. `credentialFields` becomes optional / empty for
  OAuth plugins. The OAuth-flow endpoint stays distinct; the registry's
  job is *dispatch by stored credentials*, not onboarding.
- **(B) Keep one picker but route to dedicated component by plugin id.**
  Hard-codes Meta-Coex assumption into the web. Cheaper to ship,
  expensive to extend.
- **(C) Add a richer `manifest.onboarding` union with credentials and
  oauth variants carrying full descriptors (URLs, scopes).** Future-proof
  but speculative; we have one OAuth provider.

design.md will select between A, B, C; spec.md treats them all as
acceptable as long as the user-visible behavior in P1 stories is
delivered.

---

## Success Criteria

How we know the feature is successful:

- [ ] An operator opening "Add channel account" sees two WhatsApp options
      without prior knowledge of the Coex route.
- [ ] An operator can complete a Coex connect end-to-end from the dialog
      against a sandboxed Meta app, producing a stored row with
      `pluginId='meta-whatsapp-coex'` and `channelMode='coexistence'`.
- [ ] Existing Coex rows migrated by the one-shot Drizzle migration
      continue to send messages and receive webhooks with no manual
      intervention.
- [ ] `bun check` is green (typecheck, `vp check`, all four guard scripts,
      Drizzle checksums verified after the new migration).
- [ ] `thermo-nuclear-code-quality-review` raises no structural concerns
      on the branch diff.
- [ ] No new hard-coded `pluginId === 'meta-whatsapp-coex'` checks in the
      web client — branching is driven by the typed `connect.kind`.
- [ ] The web's existing `useChannelPlugins`, `useConnectMetaCoex`, and
      `CreateChannelAccountDialog` are reused; the OAuth panel composes
      `useMutationDialog` so it inherits the same error-handling and
      open-state ownership patterns documented in `web-patterns.md` §6.
