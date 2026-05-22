# Channel Credential Fields + Generated Account Form Specification

## Problem Statement

Adding a channel account today means hand-typing a raw JSON blob into a
`<Textarea>` (`apps/web/.../channel-account-form.tsx`). The plugin's credential
shape lives only server-side in the zod `configSchema`; the
`channel-plugins.contract` exposes just `id / name / capabilities`, so the web app
has no way to know which fields a plugin needs or which are secret. The result is
error-prone (typos, wrong keys, secrets shown in plain text) and does not scale to a
second channel.

Novu solves the same problem with a declarative credential descriptor shared between
backend and frontend, from which the dashboard auto-generates the credential form.
We mirror that pattern within kizunu's existing type-safe boundary — without leaking
any provider specifics into the channel-agnostic domain (decision D2).

## Goals

- [ ] Channel plugin manifests declare a `credentialFields` descriptor
      (`key`, `label`, `type: 'text' | 'secret'`, `required`) alongside the existing
      zod `configSchema`, which remains the sole validation authority.
- [ ] The `channel-plugins` contract carries `credentialFields` so the typed client
      and web app consume it without bespoke fetches (the api-contracts boundary).
- [ ] The channel-account form renders a generated, per-plugin field list — secret
      fields masked — replacing the raw JSON textarea.
- [ ] A guard prevents drift between a plugin's `credentialFields` and its
      `configSchema` (every declared field key is a known credential key).

## Out of Scope

| Feature | Reason |
| --- | --- |
| Deriving field metadata automatically from the zod schema | Novu hand-authors the descriptor; auto-derivation is fragile and unneeded for two fields. configSchema stays the validation authority; the descriptor is a render hint. |
| Editing/rotating credentials of an existing account | The form only creates accounts today; credential update is a separate concern (and CONCERNS already flags unencrypted storage). |
| Encrypting stored credentials | Pre-existing concern tracked in `.specs/codebase/CONCERNS.md`; unchanged here. |
| Rich field types (dropdown, switch, number, validation regex, tooltips, logos) | Novu's full `IConfigCredential` surface is more than the two channels need; start minimal with `text`/`secret`. |
| A second channel plugin | This feature proves the pattern on the existing Meta plugin only. |

---

## User Stories

### P1: Generated credential form for a channel plugin ⭐ MVP

**User Story**: As a workspace admin adding a channel account, I want a form with the
exact fields the chosen plugin needs (with secrets masked) so that I can configure a
channel without hand-writing JSON or leaking tokens on screen.

**Why P1**: This is the visible payoff and the whole point of the feature; without it
nothing changes for the user.

**Acceptance Criteria**:

1. WHEN the admin selects a plugin in the channel-account form THEN the system SHALL
   render one input per `credentialFields` entry, labelled by `label`, in declared
   order.
2. WHEN a field's `type` is `secret` THEN the system SHALL render a masked input
   (characters hidden).
3. WHEN the admin submits THEN the system SHALL send `credentials` as an object keyed
   by each field's `key` with the entered string values, through the existing
   `createChannelAccount` flow.
4. WHEN a `required` field is empty THEN the system SHALL block submission client-side
   (the server `configSchema` remains the authority and still rejects invalid input
   with the standard error envelope).
5. WHEN the selected plugin changes THEN the system SHALL reset the entered field
   values to avoid carrying one plugin's credentials into another.

**Independent Test**: In the running web app, pick "WhatsApp (Meta Cloud API)", see
`waba id`, `phone number id`, and a masked `system token`; fill them, submit, and the
account is created (visible in the accounts table). No JSON textarea is present.

---

### P2: Manifest declares credential fields, exposed through the contract

**User Story**: As a plugin author, I want to declare my credential fields once on the
manifest so that both the API and the web client see them without my touching the web
app.

**Why P2**: Necessary substrate for P1, but not independently user-visible.

**Acceptance Criteria**:

1. WHEN a plugin defines its manifest THEN it SHALL include a
   `credentialFields: ChannelCredentialField[]` array, where each field is
   `{ key, label, type: 'text' | 'secret', required }`.
2. WHEN `GET /channel-plugins` is called THEN each plugin in the response SHALL include
   its `credentialFields` (validated by the `ChannelPluginsResponseSchema`).
3. WHEN the Meta plugin is read THEN its `credentialFields` SHALL be
   `wabaId` (text, required), `phoneNumberId` (text, required),
   `systemToken` (secret, required) — matching `metaCredentialsSchema`.

**Independent Test**: Call `GET /channel-plugins` and assert the Meta plugin entry
carries the three fields with the right `type`/`required` values.

---

### P3: Drift guard between credentialFields and configSchema

**User Story**: As a maintainer, I want a fast check that a plugin's declared field
keys match its validation schema so that the form and the validator can never silently
diverge.

**Why P3**: Quality safeguard; the feature works without it but is fragile over time.

**Acceptance Criteria**:

1. WHEN a plugin declares a `credentialFields` key absent from its `configSchema`'s
   accepted keys THEN a unit test SHALL fail.
2. WHEN a plugin's `configSchema` requires a key not present in `credentialFields`
   THEN a unit test SHALL fail (the form would be unfillable).

---

## Edge Cases

- WHEN a plugin declares an empty `credentialFields` array THEN the form SHALL render
  no credential inputs and submit `credentials: {}`.
- WHEN the plugins query is still loading THEN the form SHALL not render stale or empty
  credential inputs for a not-yet-selected plugin.
- WHEN the server rejects the credentials (422, `INVALID_CHANNEL_CREDENTIALS`) THEN the
  form SHALL surface the error without losing entered non-secret values.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| CRED-01 | P1: Generated form | T7, T8 | Verified |
| CRED-02 | P1: Secret masking | T7 | Verified |
| CRED-03 | P1: Submit keyed credentials | T8 | Verified |
| CRED-04 | P1: Required + server authority | T7, T8 | Verified |
| CRED-05 | P1: Reset on plugin change | T8 | Verified |
| CRED-06 | P2: Manifest credentialFields type | T1 | Verified |
| CRED-07 | P2: Contract carries credentialFields | T4, T5, T6 | Verified |
| CRED-08 | P2: Meta plugin field definitions | T2, T6 | Verified |
| CRED-09 | P3: Drift guard test | T3 | Verified |

**ID format:** `CRED-[NUMBER]`

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 9 total, 9 mapped to tasks, 0 unmapped — all implemented and verified by `bun check`.

---

## Success Criteria

- [ ] An admin can create a Meta channel account through generated fields with the
      system token masked — no JSON textarea anywhere in the flow.
- [ ] `GET /channel-plugins` returns `credentialFields` for every plugin, type-checked
      end to end via `@kizunu/api-contracts`.
- [ ] The drift guard fails if Meta's descriptor and `metaCredentialsSchema` diverge.
- [ ] `bun check` is green and the channel-agnostic domain remains free of Meta
      specifics (descriptor lives on the plugin, not the engine).
</content>
</invoke>
