# OAuth Credential Lifecycle Primitives Specification

## Problem Statement

Three cross-cutting concerns block the Coex onboarding work that lands in feature
031 and any future OAuth-using plugin (HubSpot, Google, Slack) the project
takes on:

1. **No shared shape for an OAuth credential triplet.** Every OAuth plugin would
   reinvent `accessToken` + `refreshToken?` + `accessTokenExpiresAt?` in its own
   schema, and they'd drift over time.
2. **`channel_accounts.credentials` and `connector_accounts.credentials` are
   plaintext JSONB on disk** — a database dump / compromised replica exposes
   live tokens
   (`.specs/codebase/CONCERNS.md`, "Provider credentials are stored unencrypted").
3. **No plugin-agnostic refresh seam.** Coex's business tokens expire (~60 days)
   and need server-side refresh; the engine should not bake that lifecycle into
   the Meta plugin in 031 because the same mechanism will repeat for every
   future OAuth plugin.

This slice ships the three primitives — a zod mixin, an at-rest encryption
service at the repo boundary, and an `OAuthRefreshService` + optional plugin
hook — without changing behavior for the existing non-OAuth plugins (Pipedrive
static API token, Meta standalone Cloud API system token).

Source-of-truth: [`.specs/research/whatsapp-coexistence/context.md`](../../research/whatsapp-coexistence/context.md)
sections D.3 (OAuth code → business-token shape; expires; needs refresh) and G
("OAuth credential lifecycle is a shared concern, not Meta-specific").

## Goals

- [ ] A small `oauthCredentialFields` zod mixin lives in a shared package; both
      channel-plugins and CRM connectors can spread it into their own schemas.
- [ ] An `EncryptedCredentialsService` encrypts `credentials` on write and
      decrypts on read at the persistence boundary; use-cases continue to see
      plain JSON, unchanged.
- [ ] Existing pre-030 rows (plaintext JSONB) continue to read transparently —
      the boundary is backward-compatible. New writes are encrypted.
- [ ] An optional `ChannelPlugin.refreshCredentials?(input)` hook lets plugins
      define the per-provider refresh, mirroring the `onAccountCreated` shape
      from feature 029.
- [ ] An `OAuthRefreshService` polls for credentials with an
      `accessTokenExpiresAt` inside a refresh window, calls the plugin hook,
      and persists the refreshed credentials atomically. Disabled in test like
      the dispatcher poller.
- [ ] No behavior change for current plugins — Pipedrive's API token has no
      OAuth shape, and Meta's standalone Cloud API system token doesn't expire.

## Out of Scope

| Feature                                                       | Reason                                                                                                  |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Meta Coex Embedded Signup + Coex webhooks                     | Lands in feature 031 (the first consumer of the primitives shipped here).                               |
| Key rotation / multiple key versions                           | v0.1 single key; a `keyVersion` byte on the envelope is the natural extension and is left as a TODO.    |
| KMS / managed key integration                                  | v0.1 reads the key from env (base64). KMS hook can land alongside the deploy slice (`028`).             |
| One-shot data migration to re-encrypt all existing rows        | Lazy migration — boundary reads plaintext OR envelope. A separate script can run when the pilot wants.  |
| Token-revocation flow (provider-side revoke before deletion)   | Phase 2+ concern; deletion clears the row but the provider may still hold a refresh token.              |
| Cross-cutting `refreshCredentials` on `CRMConnector`           | This slice ships the channel-plugin hook; CRM connector parity ships when the second OAuth CRM lands.  |
| Background scheduling outside Nest cron (BullMQ / external)     | Same posture as the dispatcher poller (D5): in-process cron, reassessed at higher volume.              |

---

## User Stories

### P1: Plugins share a single OAuth credential shape ⭐ MVP

**User Story**: As a plugin author adding an OAuth-driven integration, I want
to compose a shared `oauthCredentialFields` mixin into my plugin's
`metaCredentialsSchema` / `hubspotCredentialsSchema` etc. so that every OAuth
plugin in the codebase carries the same `accessToken` / `refreshToken` /
`accessTokenExpiresAt` shape and the refresh service can read it the same way.

**Why P1**: Without it, every OAuth plugin reinvents the wheel and the refresh
service can't be generic.

**Acceptance Criteria**:

1. WHEN a plugin schema does `metaCoexSchema = z.object({ ... }).extend(oauthCredentialFields)`
   (or composes via `.merge(...)`) THEN the resulting schema SHALL validate `accessToken: string`
   (required, min 1), `refreshToken: string` (optional), `accessTokenExpiresAt: Date` (optional,
   `z.iso.datetime()` on the wire, transformed to `Date`).
2. WHEN the mixin is imported by both `apps/api` and `apps/web` (e.g. through `@kizunu/api-contracts`)
   THEN the same shape SHALL be available in both, with no duplication.
3. WHEN a plugin without the mixin (e.g. existing Meta Cloud API) is loaded THEN the mixin's
   absence SHALL be a no-op — no compile error, no runtime cost.

**Independent Test**: A unit spec composes the mixin with a fake schema and
asserts the parsed shape matches the expected fields and types.

---

### P1: Provider credentials are encrypted at rest ⭐ MVP

**User Story**: As a self-host operator, I want my `channel_accounts.credentials`
and `connector_accounts.credentials` to be unreadable from a database dump or
compromised replica, so that a leak does not hand attackers a live Meta system
token or Pipedrive API key.

**Why P1**: This closes the high-priority encryption risk tracked in
`CONCERNS.md`. It is a prerequisite for any production / pilot deploy.

**Acceptance Criteria**:

1. WHEN a use-case calls `ChannelAccountRepository.create({ credentials })` THEN the row's
   `credentials` JSONB column SHALL be written as an `EncryptedCredentialsEnvelope`
   (`{ alg, v, iv, tag, data }`), never as the raw plaintext.
2. WHEN a use-case calls a repo read method that returns `credentials` THEN the value SHALL
   be the original plaintext JSON shape; the envelope is invisible above the repo boundary.
3. WHEN a repo reads a row whose `credentials` is the legacy plaintext shape (pre-030) THEN
   the value SHALL be returned unchanged (backward-compat) so existing accounts continue to
   work without a data migration.
4. WHEN the env-supplied encryption key is missing or malformed THEN the API SHALL fail
   fast at boot — config validation rejects it the same way other invalid config does.
5. WHEN a ciphertext, IV, or tag has been tampered with THEN decryption SHALL throw a
   single typed error (`CredentialsDecryptionFailedException`) — never silently return
   garbage. The repo bubbles it as a 500.
6. WHEN the encryption boundary is exercised THEN BOTH `ChannelAccountRepository` and
   `ConnectorAccountRepository` SHALL share the SAME `EncryptedCredentialsService` — the
   service is the only place AES-GCM lives.

**Independent Test**: Insert a row, dump the `credentials` column directly with `db.execute`,
assert it is the envelope shape; read it back through the repo, assert the plaintext shape
returned. Insert a legacy plaintext row directly, read through the repo, assert it returns
the plaintext unchanged.

---

### P1: Plugins can declare token refresh, with a shared scheduler ⭐ MVP

**User Story**: As a plugin author whose provider issues short-lived access
tokens (Meta Coex business token, ~60 days), I want to define a single
`refreshCredentials({ credentials })` method on my plugin and have kizunu
schedule the refresh on its own, so that the engine continues to send through
my channel without the operator having to intervene.

**Why P1**: This is the contract feature 031 depends on. Without it Coex tokens
expire silently and outbound stops.

**Acceptance Criteria**:

1. WHEN the `ChannelPlugin` interface is read THEN it SHALL expose an OPTIONAL
   `refreshCredentials?(input: RefreshCredentialsInput): Promise<unknown>` returning the
   credentials kizunu should persist. The required surface stays frozen — plugins without
   refresh (Pipedrive, existing Meta) compile unchanged.
2. WHEN `OAuthRefreshService.refreshDue()` runs THEN it SHALL find every `channel_accounts` row
   whose `credentials.accessTokenExpiresAt` is within `now + REFRESH_BUFFER_MINUTES`, group by
   `pluginId`, skip plugins without `refreshCredentials`, and for the rest call the hook with
   the current decrypted credentials.
3. WHEN the hook returns refreshed credentials THEN the service SHALL persist them through
   the encrypted boundary (so the new token is at-rest encrypted too).
4. WHEN the hook throws THEN the row SHALL be left unchanged, the error SHALL be logged with
   the channel-account id, and the next tick SHALL retry on the same row.
5. WHEN `NODE_ENV === 'test'` THEN the poller's `setInterval` SHALL NOT be started
   (mirroring `JourneyPoller`).

**Independent Test**: Integration spec — insert a row with a fake-OAuth plugin schema, set
`accessTokenExpiresAt` to 1 minute from now, run `refreshDue()` once, assert the row's
encrypted credentials now carry the refreshed values returned by the fake hook.

---

### P2: Self-host setup surfaces the encryption key requirement

**User Story**: As a self-host operator following the deploy docs, I want
`APP_CREDENTIALS_ENCRYPTION_KEY` documented in `.env.example` and the docker
compose with a clear "generate me" comment, so that I do not boot the API with
a default key in production by accident.

**Why P2**: A polish concern but important for the operator-experience promise
of self-host.

**Acceptance Criteria**:

1. WHEN `apps/api/.env.example` is read THEN it SHALL include the new key var with a comment
   pointing at how to generate one (`openssl rand -base64 32`).
2. WHEN `deploy/docker-compose.yml` is read THEN the api service SHALL pass through the env
   var (no default — dev needs to set it).
3. WHEN the variable is absent / shorter than the AES-256 key length THEN config loading
   SHALL fail fast with a clear message.

**Independent Test**: Smoke-boot the API with the var unset → fail-fast; with a 32-byte
base64 value → boot succeeds.

---

## Edge Cases

- WHEN an envelope is read that has an unknown `alg` value THEN decryption SHALL throw
  `CredentialsDecryptionFailedException` (no silent fallback to plaintext).
- WHEN a row exists with a `credentials` object that has `alg` AND extra plaintext keys
  THEN the repo SHALL treat the row as encrypted (the `alg` discriminator wins).
- WHEN `OAuthRefreshService.refreshDue()` finds two near-expiry rows for the same plugin
  THEN it SHALL refresh both in parallel (independent rows, no shared lock); a single
  per-row failure SHALL NOT prevent the others from refreshing.
- WHEN a refresh call returns `accessTokenExpiresAt` in the past THEN persistence SHALL
  succeed and the next tick re-attempts immediately (no special-case).
- WHEN the encryption service is asked to encrypt a value that is `undefined` THEN it
  SHALL throw — encryption requires a value to wrap.

---

## Requirement Traceability

| Requirement ID  | Story                                                | Phase | Status  |
| --------------- | ---------------------------------------------------- | ----- | ------- |
| OAUTHPRIM-01    | P1: Shared `oauthCredentialFields` mixin             | -     | Pending |
| OAUTHPRIM-02    | P1: Shared `oauthCredentialFields` mixin             | -     | Pending |
| OAUTHPRIM-03    | P1: Shared `oauthCredentialFields` mixin             | -     | Pending |
| OAUTHPRIM-04    | P1: Encrypted credentials at rest                    | -     | Pending |
| OAUTHPRIM-05    | P1: Encrypted credentials at rest                    | -     | Pending |
| OAUTHPRIM-06    | P1: Encrypted credentials at rest (legacy compat)    | -     | Pending |
| OAUTHPRIM-07    | P1: Encrypted credentials at rest (fail-fast config) | -     | Pending |
| OAUTHPRIM-08    | P1: Encrypted credentials at rest (tamper detection) | -     | Pending |
| OAUTHPRIM-09    | P1: Encrypted credentials at rest (shared service)   | -     | Pending |
| OAUTHPRIM-10    | P1: `refreshCredentials` hook + scheduler            | -     | Pending |
| OAUTHPRIM-11    | P1: `refreshCredentials` hook + scheduler            | -     | Pending |
| OAUTHPRIM-12    | P1: `refreshCredentials` hook + scheduler            | -     | Pending |
| OAUTHPRIM-13    | P1: `refreshCredentials` hook + scheduler            | -     | Pending |
| OAUTHPRIM-14    | P1: `refreshCredentials` hook + scheduler            | -     | Pending |
| OAUTHPRIM-15    | P2: Operator surfacing                               | -     | Pending |
| OAUTHPRIM-16    | P2: Operator surfacing                               | -     | Pending |
| OAUTHPRIM-17    | P2: Operator surfacing (fail-fast)                   | -     | Pending |

**Coverage:** 17 total. Design **invoked** — new module/package additions
(encryption service in `nestjs-shared`, mixin in `api-contracts`, refresh
service in channel module) and a backward-compat boundary contract warrant a
design pass.

---

## Success Criteria

- [ ] `db.execute(select credentials from channel_accounts)` returns envelope objects for
      new rows; the repo read returns plaintext shape.
- [ ] Legacy plaintext rows continue to read transparently — no data migration required to
      keep the slice safe to roll back.
- [ ] Adding a fake OAuth-using plugin in a unit test makes the refresh service pick up
      near-expiry rows and call the hook.
- [ ] `bun check` green; lint clean under CI strictness.
- [ ] `CONCERNS.md` entry for "Provider credentials are stored unencrypted" can be marked
      resolved in a follow-up (the entry update lands in this PR's docs commit).
