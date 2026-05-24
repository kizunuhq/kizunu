# 052 — Member Connector Identity Admin UI Specification

## Problem Statement

Feature 047 shipped the backend + api-client for the member-connector
identity mapping but deferred the admin web surface (T17). Today an
admin can only manage the mappings via `curl`/Postman.

## Goals

- [ ] Admin can list, create, and delete member-connector identities for
      each Pipedrive (or other) account from the CRM connectors settings
      screen.
- [ ] Reuses the api-client hooks shipped in 047
      (`useMemberConnectorIdentities` / `useCreateMemberConnectorIdentity`
      / `useDeleteMemberConnectorIdentity`).
- [ ] Web patterns: dialog-first per `web-patterns.md` §6, dumb form per
      §3, `useMutationDialog` for the wrapper.

## Out of Scope

- Update/repoint via PATCH (the use case is shipped; the UI is held —
  admins can delete + recreate). Worth wiring as a separate slice once
  it's actually needed.
- Multi-account aggregate view; mappings are scoped per connector
  account (the spec's "list all identities across all accounts" is a
  future polish).
- Per-page filter / search across mappings.

---

## User Stories

### P1: Admin lists identities for a connector account ⭐ MVP

**Acceptance Criteria:**

1. WHEN the admin opens the connectors settings AND the workspace has
   at least one connector account THEN a "Member identities" card SHALL
   show a connector-account picker + a table listing
   `{ userName, userEmail, externalId, createdBy, createdAt }` for the
   selected account.
2. WHEN the workspace has no connector accounts THEN the card SHALL
   render an empty-state message and disable the picker + the create
   button.

**Requirement IDs:** `IDENTITY-UI-01`, `IDENTITY-UI-02`.

---

### P1: Admin creates an identity

**Acceptance Criteria:**

1. WHEN the admin clicks "Add identity" THEN a `ResourceDialog` SHALL
   render a `MemberIdentityForm` with: a member picker (active members
   only) + an externalId text input.
2. WHEN the form submits AND the create succeeds THEN a toast confirms
   AND the dialog closes AND the table re-fetches.
3. WHEN the create returns `422 owner.mapping-conflict` THEN
   `FormError` SHALL render `getApiErrorMessage(error)` inside the
   dialog.

**Requirement IDs:** `IDENTITY-UI-03`, `IDENTITY-UI-04`, `IDENTITY-UI-05`.

---

### P1: Admin deletes an identity

**Acceptance Criteria:**

1. WHEN the admin clicks the row's destructive `DropdownMenuItem` THEN a
   `DeleteResourceDialog` SHALL ask for a name-typed confirmation.
2. WHEN the deletion succeeds THEN a toast confirms AND the table
   re-fetches.

**Requirement IDs:** `IDENTITY-UI-06`.

---

## Success Criteria

- `bun check` green; web form fat-validation unit spec covers the
  member-required + externalId-required branches.
- Adjacent routes (`/settings/connectors`) keep rendering correctly.
