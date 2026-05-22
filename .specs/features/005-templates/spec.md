# Templates Specification

## Problem Statement

A cadence `Step` sends either freeform text (inside the 24h window) or a pre-approved
**Template**. For Meta, a `Template` is a reference to an approved HSM message
(`providerTemplateName`, `language`, `variables[]`), not a freeform body. v0.1 needs
`Template` as a workspace-owned domain entity with CRUD so cadence steps can reference
it and the engine can resolve the HSM to send outside the window.

## Goals

- [ ] `Template` table (workspace-owned): label `name`, target `channelPluginId`,
      `providerTemplateName`, `language`, ordered `variables[]`.
- [ ] Admin/member CRUD: create (unique name per workspace), list, update, delete.
- [ ] Typed contracts + client hooks; consistent with the type-safe API boundary.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Template sync/approval status from Meta | v0.1 stores a reference; approval happens in Meta's console |
| Cadence/Step wiring to templates | Cadence aggregate (feature `006`) |
| Freeform message bodies | Sent inline by the engine inside the 24h window; not a Template |

---

## User Stories

### P1: Manage message templates ⭐ MVP

**User Story**: As a BDR/admin, I create and manage the HSM templates a cadence step can
reference, so the engine can send approved messages outside the 24h window.

**Acceptance Criteria**:

1. WHEN a template is created with a name unique within the workspace THEN it SHALL
   persist and return its id.
2. WHEN a template is created with a name already used in the workspace THEN it SHALL
   reject (`DuplicateTemplateException`, 409) and write no row.
3. WHEN templates are listed THEN the response SHALL include all of the workspace's
   templates with their fields.
4. WHEN a template is updated/deleted by id within the workspace THEN it SHALL apply;
   WHEN the id is not in the workspace THEN it SHALL reject (`TemplateNotFoundException`).
5. WHEN a non-member of the workspace calls these THEN it SHALL reject (403, admin guard).

**Independent Test**: create two templates (assert unique-name rejection), list, update,
delete, assert not-found on a foreign id.

---

## Edge Cases

- WHEN `variables` is empty THEN the template is valid (a static template).
- WHEN updating only some fields THEN unspecified fields SHALL be left unchanged.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| TPL-01 | P1: create + unique name | Tasks | Verified |
| TPL-02 | P1: list | Tasks | Verified |
| TPL-03 | P1: update/delete + not-found | Tasks | Verified |

**Coverage:** 3 total, mapped to tasks.

---

## Success Criteria

- [ ] `bun check` green; CI-strict lint clean.
- [ ] Unique name per workspace is provably enforced.
- [ ] Cadence steps (feature `006`) can reference a template id.
</content>
