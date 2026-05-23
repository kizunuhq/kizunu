# SMTP Mail Transport Tasks

Tasks are atomic, one logical change each. Sequence matters because the
container build cache depends on `apps/api/package.json` being current before
`docker compose up --build api` will install `nodemailer` into the image.

## T1 — Add Mailpit to dev docker-compose [SMTP-06, SMTP-07, SMTP-09]

**What**: A new `mailpit` service in `deploy/docker-compose.yml` with the
profiles `['all', 'infra', 'api', 'mail']`, ports `1025:1025` + `8025:8025`,
`MP_SMTP_AUTH_ACCEPT_ANY=1`, `MP_SMTP_AUTH_ALLOW_INSECURE=1`, and a healthcheck
on `wget -qO- http://localhost:8025/api/v1/info`.
Plus: api service gains `APP_SMTP_HOST=mailpit`, `APP_SMTP_PORT=1025`,
`APP_SMTP_USER=''`, `APP_SMTP_PASSWORD=''`, `APP_SMTP_SECURE='false'`,
`APP_MAIL_FROM='Kizunu <noreply@kizunu.local>'`, and a second
`depends_on: { mailpit: { condition: service_healthy } }` entry alongside the
existing Postgres dependency.

**Where**: `deploy/docker-compose.yml`.

**Depends on**: nothing.

**Reuses**: the existing compose profile vocabulary, the existing healthcheck
shape (Postgres uses `pg_isready`).

**Done when**:
- `docker compose -f deploy/docker-compose.yml --profile mail up -d` brings up
  only `kizunu-mailpit` (healthy).
- `docker compose -f deploy/docker-compose.yml --profile api up -d` brings up
  Postgres + Mailpit + api, all healthy.
- `curl -s http://localhost:8025/api/v1/info` returns Mailpit's JSON.

**Tests**: none — compose config is thin glue covered by the manual smoke above
and by every later task that boots the api.

**Gate**: smoke commands above (no `bun check` impact yet — no source changed).

---

## T2 — Add `nodemailer` to `apps/api` [SMTP-01]

**What**: `bun add nodemailer` and `bun add -d @types/nodemailer` inside
`apps/api`. Bun's isolated install will write the symlinks into
`apps/api/node_modules/nodemailer` and `apps/api/node_modules/@types/nodemailer`.

**Where**: `apps/api/package.json`, root `bun.lock`.

**Depends on**: T1 (the api container needs to be rebuilt to pick up the new
dep — see Execute notes).

**Reuses**: existing `bun install` workflow.

**Done when**:
- `apps/api/package.json` `dependencies.nodemailer` = `^8.0.7` (or the current
  latest 8.x).
- `apps/api/package.json` `devDependencies['@types/nodemailer']` = `^8.0.0`.
- `bun.lock` updated.
- `bunx vp run --filter @kizunu/api check-types` is green (no usage yet, so a
  no-op but verifies no install regression).

**Tests**: none — adding a dep is not behavior.

**Gate**: `bunx vp run --filter @kizunu/api check-types`.

---

## T3 — Extend `api.config.ts` with `mail.*` [SMTP-01, SMTP-02, SMTP-03]

**What**: Add a `mail: z.object({ smtpHost, smtpPort, smtpUser, smtpPassword,
smtpSecure, from })` section to `configSchema`, and read the corresponding
`process.env.APP_SMTP_*` / `APP_MAIL_FROM` in `load()`. Defaults per the
design: empty strings, port `1025`, secure `false` via `z.stringbool`, from
`'Kizunu <noreply@kizunu.local>'`.

**Where**: `apps/api/src/api.config.ts`.

**Depends on**: T2 (no — config doesn't import nodemailer; T3 can land
independently of T2).

**Reuses**: the existing zod v4 schema (top-level formats per
`.agents/rules/conventions.md`), the `z.stringbool` pattern already used for
`auth.registrationDisabled`.

**Done when**:
- `bunx vp run --filter @kizunu/api check-types` is green.
- `bun scripts/check-zod-v4.ts` is green (no chained `string().<format>()` —
  none introduced here, but the gate runs).
- Booting the api with no `APP_SMTP_*` set produces a valid config (defaults
  apply) — verified by the api starting without `Invalid configuration` errors.
- Booting with `APP_SMTP_SECURE=false` does NOT coerce to `true` (the bug
  `z.coerce.boolean` would introduce).

**Tests**: none added for `api.config.ts` — schema is a thin pass-through
covered by the api's boot path and by the integration test in T5.

**Gate**: `bunx vp run --filter @kizunu/api check-types`,
`bun scripts/check-zod-v4.ts`.

---

## T4 — `SmtpMailSender` class [SMTP-01, SMTP-02, SMTP-03, SMTP-04]

**What**: New file `apps/api/src/modules/identity/core/mail/smtp-mail-sender.ts`
implementing the `MailSender` abstract class via `nodemailer`. Constructs
exactly one `Transporter` in the constructor reading from
`ConfigService<Config>`. `send(message)` calls `transporter.sendMail({ from,
to, subject, text })` and logs a success line; rejection propagates.

**Where**: `apps/api/src/modules/identity/core/mail/smtp-mail-sender.ts`.

**Depends on**: T2 (`nodemailer`), T3 (`mail.*` config).

**Reuses**: `MailSender` abstract port, `EmailMessage` interface, `ConfigService`
(already injected by the OAuth provider factory).

**Done when**:
- `SmtpMailSender extends MailSender`, `@Injectable()`, single `Transporter`,
  conditional `auth` based on whether `smtpUser` is set.
- File under 30 LOC of body (per `.agents/rules/code-standards.md` §10 — the
  `send` method is ~6 lines, the constructor ~14).
- File in kebab-case per `AGENTS.md`.

**Tests**: T5 (focused unit + integration around the contract behavior).

**Gate**: T5 unit + integration tests green.

---

## T5 — Tests for `SmtpMailSender` via `generate-tests` skill

**What**: Invoke the `generate-tests` skill against `SmtpMailSender` to
classify and author tests. Expected classification:
- `SmtpMailSender` is **fat** (it owns the `auth: undefined` branch and the
  config → transporter mapping). Unit test the constructor's auth branch
  (smtpUser empty → no auth; smtpUser set → user/pass) by intercepting
  `createTransport` (e.g. `vi.spyOn`). Integration test the round-trip against
  a Mailpit container started by the integration project's `global-setup.ts`,
  or via the `@kizunu/api` test config (defer to the skill's recommendation).
- `buildMailSender` factory is **thin** (single env check). Skip a dedicated
  unit test; it's covered by an api-boot integration test that asserts
  `MailSender` resolves to `SmtpMailSender` when `mail.smtpHost` is set, and
  to `ConsoleMailSender` when empty.

**Where**: `apps/api/src/__test__/unit/identity/smtp-mail-sender.spec.ts`
(and any integration/e2e the skill recommends).

**Depends on**: T4.

**Reuses**: Vitest harness, `vi.spyOn` / `vi.mock`, the existing
`@kizunu/api/test/` fixtures.

**Done when**:
- `bun test:unit` covers the auth-branch assertion.
- `bun test:integration` (if the skill writes one) is green and respects the
  serial-DB constraint (`TESTING.md`).
- The skill's `generate-tests` summary in this task notes the thin/fat
  classification it used.

**Tests**: this IS the test task.

**Gate**: `bun test:unit` (always) and `bun test:integration` (if added).

---

## T6 — Wire `buildMailSender` factory in `IdentityModule` [SMTP-05]

**What**: Replace `{ provide: MailSender, useClass: ConsoleMailSender }` with
`{ provide: MailSender, inject: [ConfigService], useFactory: buildMailSender }`,
and define `buildMailSender(config)` next to the existing
`buildOAuthProviders(config)` factory. Returns `new SmtpMailSender(config)`
when `config.get('mail.smtpHost')` is truthy, else `new ConsoleMailSender()`.

**Where**: `apps/api/src/modules/identity/identity.module.ts`.

**Depends on**: T4 (`SmtpMailSender`), T3 (config).

**Reuses**: the `buildOAuthProviders` factory pattern in the same file.

**Done when**:
- `IdentityModule` boot resolves `MailSender` to `SmtpMailSender` when
  `APP_SMTP_HOST=mailpit` is set, and to `ConsoleMailSender` when empty —
  verified by the integration test in T5.
- No existing test breaks (`bun test:unit` still green; the e2e password-reset
  spec that spies on `Logger.prototype.log` for `ConsoleMailSender` runs with
  empty `APP_SMTP_HOST` and still passes).

**Tests**: covered by T5's integration test.

**Gate**: `bun check`.

---

## T7 — End-to-end smoke against Mailpit [SMTP-01, SMTP-06, SMTP-08]

**What**: With the api + Mailpit up, manually walk the three auth flows
(signup → verify, resend-verify-from-inside, forgot-password → reset → login)
and assert each delivers a message to Mailpit's `GET
/api/v1/messages` endpoint with the expected `from`, `to`, `subject`, and a
clickable URL.

**Where**: not a checked-in test — this is the manual verification step the
spec lists under Success Criteria. The behavior is exercised by T5's
integration test; this task confirms the dev flow in the actual browser/Mailpit
UI.

**Depends on**: T1, T6.

**Reuses**: the spike validation already done before this skill ran.

**Done when**:
- Each of the three flows produces a Mailpit message; clicking each link
  completes the flow in the web app (verify → "Email verified"; reset →
  "Password updated"; signup → workspace overview).

**Tests**: T5 covers the contract; this task verifies the dev UX.

**Gate**: visual confirmation.

---

## T8 — Update `.specs/` + `CONCERNS` + `STATE` + `ROADMAP` [doc-tracking]

**What**: Close CONCERNS §Medium "Mail is delivered by a console logger" with a
"(Resolved)" prefix and a one-paragraph summary that points at this feature
(`040`). Add a `STATE.md` "Lessons" line summarising the factory + Mailpit
choice. Optionally note the SMTP transport under ROADMAP Phase 1.6 or 1.7
(it sits in the seam between auth enrichment and infra; either home is
defensible — pick the one with the closest adjacent items).

**Where**:
- `.specs/codebase/CONCERNS.md`
- `.specs/project/STATE.md`
- `.specs/project/ROADMAP.md`

**Depends on**: T6 (the swap is the thing that resolves the concern).

**Reuses**: the `(Resolved)` italic-block pattern already in `CONCERNS.md`
(see the CORS/login-rate-limit and credentials-encryption entries).

**Done when**:
- CONCERNS still has "Mail is delivered by a console logger" as a header, with
  a `(Resolved)` block below it.
- STATE has a one-line "Lesson" referencing feature `040`.
- ROADMAP has a corresponding "COMPLETE" entry (pick Phase 1.6 or 1.7 with
  rationale).

**Tests**: docs.

**Gate**: re-read the three files for accuracy.

---

## Execute Order

```
T1 ─┬─► T2 ─► T3 ─► T4 ─► T5 (tests)
    │                  │
    └──────────────────┴─► T6 ─► T7 (manual) ─► T8 (docs)
```

T1 is independent. T2 → T3 → T4 is the source-side chain. T5 closes the test
loop. T6 wires it. T7 is the manual smoke. T8 is the documentation closure.

## Atomic-commit plan

| Commit                                                       | Includes               |
| ------------------------------------------------------------ | ---------------------- |
| `chore(deploy): add mailpit dev compose service`             | T1                     |
| `chore(api): add nodemailer dependency`                      | T2                     |
| `feat(api): add mail.* config schema for smtp transport`     | T3                     |
| `feat(api): add SmtpMailSender for mail boundary`            | T4                     |
| `test(api): cover SmtpMailSender auth + factory wiring`      | T5                     |
| `feat(api): pick SmtpMailSender via factory when smtp host set` | T6                  |
| `docs: close console-mail concern; record feature 040`       | T8                     |

T7 (manual smoke) doesn't get a commit; it's part of the PR description's
"verification" notes.
