# 048 — Template Variable Resolution Specification

## Problem Statement

`JourneyDispatcher.sendStep` builds a `SendPayload` with
`template: { name, language }` but **never sets `template.variables`**. The
`templates.variables` JSONB column declares the variable names a template
expects (e.g. `['leadFirstName']`), but no resolver maps those names to
runtime values at send time. As a result, when a Meta-approved template
declares parameters (e.g. `Hi {{1}}, ...`), the engine sends without filling
them — Meta rejects the message (or worse, sends with `{{1}}` literal).

Documented as a HIGH item in `.specs/codebase/CONCERNS.md` ("Dispatcher
gaps: ..., template variables"). Blocks any pilot whose templates are
personalized.

## Goals

- [ ] Templates that declare `variables` get a resolved `Record<string, string>`
      built at send time from Lead fields, passed to
      `SendPayload.template.variables`.
- [ ] The Meta plugin's `send` maps `variables` onto Meta's HSM template
      component payload (`{ type: 'body', parameters: [{ type: 'text', text: value }, ...] }`).
- [ ] An unresolved-required variable (template declares it, lead has no value)
      transitions the journey to `error_state` with reason
      `template_variable_missing` (new) — never silently sends a half-filled
      template.
- [ ] No new schema column on `leads`; values come from existing fields
      (`name`, `phone`, `ownerExternalId`, derived `firstName`).

## Out of Scope

| Excluded | Reason |
| --- | --- |
| Custom-field variable mapping (Pipedrive custom-field IDs) | Pilot uses fixed Lead fields. Custom fields are a Phase 2.1+ slice and need a per-template-variable mapping table. |
| Variables sourced from the BDR (the cadence owner) | Pilot variables are lead-centric; sender-side variables (e.g. `{{senderFirstName}}`) ship later. |
| Localization / i18n of variable values | Out of scope for v0.1; values are stored as-is. |
| Variable transforms (uppercase, trim, default-if-empty) | YAGNI. Add when a real pilot needs it. |
| Reading custom fields from `Lead.raw` (the Pipedrive payload) | `Lead.raw` is not currently persisted on the row; ingestion would need to start mirroring custom fields, which is a separate slice. |

---

## User Stories

### P1: Dispatcher fills declared template variables from Lead fields ⭐ MVP

**User Story:** As a BDR, I want my approved HSM template's `{{firstName}}` to be
replaced with the lead's actual first name when the cadence dispatches, so
the message Meta sends is correctly personalized.

**Why P1:** Without this, every personalized template fails Meta validation
(or sends with literal `{{1}}`), making the pilot's 5 FUP templates unusable
if any of them carry variables.

**Acceptance Criteria:**

1. WHEN the dispatcher's `sendStep` resolves a template AND
   `template.variables: ['leadFirstName']` THEN it SHALL call a new
   `TemplateVariableResolver.resolve(template.variables, lead)` returning
   `Record<string, string>` AND pass that as `SendPayload.template.variables`.
2. WHEN a variable name matches a declared resolver entry (`leadFirstName`,
   `leadName`, `leadPhone`, `ownerExternalId`) THEN the resolver SHALL
   substitute the corresponding Lead field value.
3. WHEN `leadFirstName` is requested AND `lead.name = "Acme Demo Corp"` THEN
   the resolver SHALL return the first whitespace-delimited token (`"Acme"`).
4. WHEN every declared variable resolves to a non-empty string THEN the
   dispatcher SHALL proceed with the resolved payload and `decision.action`
   stays unchanged.

**Independent Test:** Unit test on `TemplateVariableResolver.resolve` with a
hand-rolled Lead fixture and `variables: ['leadFirstName', 'leadName']`
returning the expected map.

**Requirement IDs:** `TPLVAR-01`, `TPLVAR-02`, `TPLVAR-03`, `TPLVAR-04`.

---

### P1: Missing required variable parks the journey, not silent half-send

**User Story:** As an admin, if a template declares a variable that the
lead has no value for (e.g. `{{leadPhone}}` but the deal has no phone),
I want the journey to land in `error_state` with a clear reason so I can
fix it — never have Meta reject silently mid-cadence.

**Why P1:** Silent failures hide problems; explicit parks make them
actionable.

**Acceptance Criteria:**

1. WHEN the resolver finds a declared variable whose Lead field is empty
   or absent THEN it SHALL throw `TemplateVariableUnresolvedException`
   carrying the variable name.
2. WHEN `sendStep` catches that exception THEN it SHALL record the touch
   attempt as `failed` with error `template_variable_missing:<name>` AND
   transition the journey to `error_state` with
   `errorReason = 'template_variable_missing'`.
3. WHEN a variable name is unknown (not in the resolver's declared set)
   THEN the resolver SHALL throw `TemplateVariableUnknownException`; same
   handling as above with reason `template_variable_unknown`.

**Independent Test:** Unit test on the resolver verifying both exceptions
get thrown with the right context; integration test on the dispatcher
asserting the journey reaches `error_state` with the new reasons.

**Requirement IDs:** `TPLVAR-05`, `TPLVAR-06`, `TPLVAR-07`.

---

### P2: Meta plugin maps `variables` into HSM components payload

**User Story:** As a BDR, my personalized template message arrives in
WhatsApp with the variable values inline — Meta accepts and delivers.

**Why P2:** The plugin already accepts the `variables` field on
`SendPayload.template`; mapping it correctly onto Meta's HSM body
parameters is a small but critical bit of plumbing. This story is P2
because it's the second half of the same story as P1 — the dispatcher's
work is meaningless without the plugin's. (Marked P2 only to scope it
into the same PR as P1; both must ship together.)

**Acceptance Criteria:**

1. WHEN `MetaWhatsappPlugin.send` receives `template.variables: { leadFirstName: 'Acme' }`
   AND the template was approved with variable positions `{{1}} = leadFirstName`
   THEN the Meta API call body's `components` SHALL include
   `{ type: 'body', parameters: [{ type: 'text', text: 'Acme' }] }`.
2. WHEN positions are inferred from the order declared in the resolver's
   inputs (the dispatcher passes `template.variables` keyed by name; the
   plugin must produce positional parameters in declaration order) THEN
   the plugin SHALL use the order of keys as the positional order.

**Independent Test:** Unit spec on `meta-whatsapp.plugin.ts` `send` with a
stubbed fetch and a known variable map.

**Requirement IDs:** `TPLVAR-08`, `TPLVAR-09`.

---

## Edge Cases

- WHEN a template declares zero variables (`variables: []`) THEN the
  dispatcher SHALL pass `template: { name, language }` without a `variables`
  field (current behavior preserved).
- WHEN a variable name appears twice in `template.variables` THEN the
  resolver SHALL still resolve it once and return one entry (idempotent).
- WHEN `lead.name` contains only whitespace THEN `leadFirstName` is empty
  → `TemplateVariableUnresolvedException`.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| TPLVAR-01 | P1 fill variables | Design | Pending |
| TPLVAR-02 | P1 fill variables | Design | Pending |
| TPLVAR-03 | P1 fill variables | Design | Pending |
| TPLVAR-04 | P1 fill variables | Design | Pending |
| TPLVAR-05 | P1 missing variable | Design | Pending |
| TPLVAR-06 | P1 missing variable | Design | Pending |
| TPLVAR-07 | P1 missing variable | Design | Pending |
| TPLVAR-08 | P2 plugin mapping | Design | Pending |
| TPLVAR-09 | P2 plugin mapping | Design | Pending |

---

## Success Criteria

- [ ] Integration test exercising the dispatcher → meta plugin path with a
      template carrying `leadFirstName` produces the expected
      `parameters: [{ type: 'text', text: '<resolved>' }]` payload.
- [ ] Integration test for the missing-variable branch lands the journey in
      `error_state` reason `template_variable_missing` with no message sent
      to Meta.
- [ ] Pilot's 5 HSM templates can be loaded with whatever variables they
      end up needing (decided post-Meta-approval-round); the engine fills
      them without manual intervention.
- [ ] `LeadJourneyErrorReason` const object gains
      `TemplateVariableMissing = 'template_variable_missing'` and
      `TemplateVariableUnknown = 'template_variable_unknown'` (per
      enums-rule §1).
