# SMTP Mail Transport Specification

## Problem Statement

Outbound auth mail (signup verification, resend verification, password reset)
currently runs through `ConsoleMailSender`, which logs the message instead of
delivering it. The flows are correct and secure end-to-end (tokens are hashed,
single-use, carried out-of-band), but a real user cannot receive the link — an
operator has to scrape `docker logs kizunu-api` for it. CONCERNS §Medium "Mail is
delivered by a console logger, not a real provider" tracks this as the last
remaining swap before the v0.1 pilot can ship a real registration or recovery
moment. Dev/CI also needs a deterministic inbox so the three auth flows can be
exercised end-to-end without hitting an external provider.

## Goals

- [ ] An operator can configure SMTP via env (host/port/user/password/secure/from)
      and outbound auth mail leaves the API through that transport, hitting any
      RFC-compliant SMTP server.
- [ ] A developer can `docker compose up` the dev stack and see every outbound
      auth mail land in a Mailpit inbox at `http://localhost:8025`, with no API
      code edits and no external accounts.
- [ ] Existing dev workflows that rely on `ConsoleMailSender` continue to work
      unchanged when SMTP is not configured (no breakage for ops that don't run
      Mailpit).

## Out of Scope

| Feature                                                | Reason                                                                                                                       |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| HTML mail / template engine                            | The bodies stay plain-text — same content the use cases already build. Templating is a later concern (CONCERNS deferred).    |
| Provider abstraction beyond SMTP (SES, SendGrid API)   | SMTP is the universal protocol every provider speaks; an API-based sender is a future plugin behind the same `MailSender`.   |
| Invitation flow migration onto `MailSender`            | CONCERNS notes invitations still return the token in the response. Moving them onto mail is adjacent scope; track separately. |
| Email queue / retry / DLQ                              | v0.1 sends synchronously inside the use case. A queue is a Phase 2 hardening item.                                          |
| DKIM/SPF/DMARC posture for the dev compose             | Mailpit is a dev-only inbox; production deployments rely on the operator's SMTP gateway for deliverability hardening.        |
| Auto-bumping `users.emailVerifiedAt` on hard SMTP bounce | Bounce handling is a provider feature; out of scope for the universal SMTP path.                                            |

---

## User Stories

### P1: Operator wires real SMTP for outbound auth mail ⭐ MVP

**User Story**: As a self-hosting operator, I want to set SMTP env vars on the
api container so verification and password-reset mail reach the user's actual
inbox, instead of being trapped in `docker logs`.

**Why P1**: Without this, the v0.1 pilot can't onboard a real user — they'd
never receive the verify link. This is the last "real mail transport swap"
in CONCERNS §Medium.

**Acceptance Criteria**:

1. WHEN `APP_SMTP_HOST` is set at boot AND a use case calls
   `MailSender.send({ to, subject, body })`, THEN the api SHALL connect to the
   configured SMTP server, deliver the message with the configured `from`,
   and resolve only after the SMTP server accepts it.
2. WHEN `APP_SMTP_USER` is set, THEN the api SHALL authenticate to the SMTP
   server with `APP_SMTP_USER` + `APP_SMTP_PASSWORD`.
3. WHEN `APP_SMTP_USER` is empty, THEN the api SHALL connect anonymously (so a
   local Mailpit with `MP_SMTP_AUTH_ACCEPT_ANY` works without credentials).
4. WHEN `APP_SMTP_SECURE` is `true`, THEN the api SHALL initiate the SMTP
   connection over TLS (port 465 style); when `false`, plain or STARTTLS as the
   server advertises.
5. WHEN the configured SMTP server rejects or the network fails, THEN the
   `MailSender.send` SHALL reject with the underlying error and the caller
   (e.g. `RequestPasswordResetUseCase`) SHALL surface it as a 5xx — the use
   case's hashed token is still persisted (current behavior preserved).
6. WHEN `APP_SMTP_HOST` is missing or empty, THEN the api SHALL fall back to
   `ConsoleMailSender` and continue logging mail — existing dev workflows do not
   break.

**Independent Test**: Boot the api with `APP_SMTP_HOST=mailpit` against a
running Mailpit container, call `POST /auth/password-reset` for a known user,
and observe the message arrive in Mailpit's inbox API
(`GET http://localhost:8025/api/v1/messages`). Then boot the api with
`APP_SMTP_HOST` empty and observe the existing `[ConsoleMailSender] mail to=…`
log line on the same call.

---

### P1: Developer sees auth mail in a local inbox ⭐ MVP

**User Story**: As a contributor working on auth or onboarding, I want
`docker compose up` to bring up a Mailpit inbox at `http://localhost:8025` so
I can click verify/reset links from a UI inbox instead of grepping container
logs.

**Why P1**: Removes the asymmetry between "the use case is correct in tests"
and "the user actually receives the link". Reduces friction for every future
auth-adjacent feature (invitations, notifications, alerts).

**Acceptance Criteria**:

1. WHEN a developer runs `docker compose -f deploy/docker-compose.yml --profile api up`,
   THEN Mailpit SHALL come up as a sibling service of the api with SMTP on
   `:1025` and the web UI on `:8025`.
2. WHEN the api container starts, THEN it SHALL `depends_on` Mailpit being
   healthy so the first outbound mail in the boot path doesn't race the inbox.
3. WHEN a developer triggers any auth mail flow (signup, resend verify,
   password reset) against the dev stack, THEN the message SHALL appear in the
   Mailpit web UI with the expected `from`, `to`, `subject`, and body
   (including the verification/reset URL).
4. WHEN a developer browses to `http://localhost:8025` and clicks a verification
   or reset link inside an opened message, THEN the link SHALL open the web app
   on `http://localhost:3000` and complete the flow with no manual
   token-copying.

**Independent Test**: From a clean repo, `docker compose ... up`, register a
new user via the web app at `http://localhost:3000/auth/signup`, then open
`http://localhost:8025`, click the verify link in the inbox, and land on the
"Email verified" screen.

---

### P2: Mailpit isolated under its own compose profile

**User Story**: As a developer who only needs the database for a backend
integration test loop, I want Mailpit to be opt-in (under its own profile) so
the minimum `infra`-only stack stays small.

**Why P2**: Convenience polish. Mailpit is tiny, but compose profile hygiene
keeps `--profile infra` from pulling unrelated images. Belongs in the same PR
because the profile choice is a deploy-compose decision, not a follow-up.

**Acceptance Criteria**:

1. WHEN a developer runs `--profile infra`, THEN Mailpit SHALL come up
   alongside Postgres so DB-backed work that exercises auth flows still has a
   sink.
2. WHEN a developer runs `--profile mail`, THEN Mailpit SHALL come up on its
   own (without Postgres or the api) for inbox-only inspection.
3. WHEN a developer runs `--profile all` or `--profile api`, THEN Mailpit SHALL
   come up alongside the api (since the api `depends_on` it when SMTP env is set).

**Independent Test**: `docker compose --profile mail up` brings up only the
`kizunu-mailpit` container.

---

## Edge Cases

- WHEN `APP_SMTP_HOST` is set but the SMTP server is unreachable at boot, THEN
  the api SHALL NOT fail to start (the transport is lazy — only `send()` fails).
  Boot-time failure would be a regression versus today's `ConsoleMailSender`.
- WHEN `APP_SMTP_PORT` is unset, THEN the schema SHALL default to `1025`
  (Mailpit's standard) so a `APP_SMTP_HOST=mailpit` with no port works.
- WHEN `APP_MAIL_FROM` is unset, THEN the schema SHALL default to
  `Kizunu <noreply@kizunu.local>` so the dev compose works without extra env.
- WHEN `APP_SMTP_SECURE` receives the string `"false"`, THEN the parser SHALL
  treat it as the boolean false (consistent with `DISABLE_USER_REGISTRATION` per
  `.agents/rules/conventions.md` — `z.stringbool`, not `z.coerce.boolean`).
- WHEN `MailSender.send` is invoked concurrently by multiple use cases, THEN
  the underlying transport SHALL be safe to share across calls (single
  `nodemailer` transporter, reused).

---

## Requirement Traceability

| Requirement ID | Story                                          | Phase    | Status  |
| -------------- | ---------------------------------------------- | -------- | ------- |
| SMTP-01        | P1: Operator wires real SMTP                   | Design   | Pending |
| SMTP-02        | P1: Operator wires real SMTP — auth on/off    | Design   | Pending |
| SMTP-03        | P1: Operator wires real SMTP — secure on/off  | Design   | Pending |
| SMTP-04        | P1: Operator wires real SMTP — error surfaces | Design   | Pending |
| SMTP-05        | P1: Operator wires real SMTP — console fallback | Design | Pending |
| SMTP-06        | P1: Developer sees auth mail in local inbox    | Design   | Pending |
| SMTP-07        | P1: Developer sees auth mail — depends_on      | Design   | Pending |
| SMTP-08        | P1: Developer sees auth mail — UI link click   | Design   | Pending |
| SMTP-09        | P2: Mailpit isolated under its own profile     | Design   | Pending |

**ID format:** `SMTP-NN`

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 9 total, all to be mapped to tasks in tasks.md.

---

## Success Criteria

How we know the feature is successful:

- [ ] Boot the api with `APP_SMTP_HOST=mailpit` + Mailpit up, then trigger
      signup / resend-verify / forgot-password from the web UI; each message
      arrives in the Mailpit inbox within 2 seconds, with the verification or
      reset URL the use case minted.
- [ ] Boot the api with `APP_SMTP_HOST` empty; the `[ConsoleMailSender]` log
      line still appears on the same calls (existing behavior preserved).
- [ ] CONCERNS §Medium "Mail is delivered by a console logger" closes; only the
      invitation-migration follow-up remains, tracked separately.
- [ ] `bun check` is green; tests added per `generate-tests` thin/fat
      classification.
