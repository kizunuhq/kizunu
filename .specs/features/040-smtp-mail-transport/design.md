# SMTP Mail Transport Design

## Summary

Add an `SmtpMailSender` behind the existing `MailSender` abstract DI token
(introduced in feature `020`), select it via a NestJS `useFactory` when
`mail.smtpHost` is configured, otherwise keep `ConsoleMailSender`. Extend
`api.config.ts` with a `mail.*` section (`smtpHost`, `smtpPort`, `smtpUser`,
`smtpPassword`, `smtpSecure`, `from`) read from `APP_SMTP_*` / `APP_MAIL_FROM`.
Add a Mailpit container to `deploy/docker-compose.yml` under appropriate
profiles, and point the api at it via `APP_SMTP_HOST=mailpit` so the dev stack
delivers mail end-to-end without configuration.

This is a **closed change**: no caller (use case, controller, contract) sees
the swap. Every consumer of `MailSender` continues to call `send({ to, subject,
body })`; the DI factory chooses the implementation.

## Architectural Decisions

### Factory vs class binding

Use `{ provide: MailSender, inject: [ConfigService], useFactory: buildMailSender }`
in `IdentityModule`, not `useClass`. Reasons:

- The same module already uses a factory for `OAUTH_PROVIDERS` (only providers
  with both an id and a secret configured are wired). The factory pattern is
  established and the conditional shape is identical (presence of an env var
  selects the implementation).
- Wiring as `useClass` and conditionally swapping in the test fixture is
  uglier than a single factory that reads config once at boot.
- The decision is "boot-time, env-driven, no runtime mutation" — exactly what
  `useFactory` is for.

### One transporter per process (singleton)

The `SmtpMailSender` constructs a single `nodemailer` transporter in its
constructor and reuses it across every `send()` call. `nodemailer.createTransport`
maintains a connection pool internally; building a transporter per call would
re-resolve DNS and re-negotiate TLS on every email, and would prevent the pool
benefit. The class is `@Injectable()` and lives in the standard NestJS
singleton scope.

### `z.stringbool` for `smtpSecure`

Consistent with `auth.registrationDisabled` (`.agents/rules/conventions.md`).
`z.coerce.boolean()` maps the string `"false"` to `true`, which is the exact
footgun the project codified the convention to avoid. `APP_SMTP_SECURE="false"`
must mean "plain SMTP".

### Plain-text bodies, not HTML

Out of scope per spec. The use cases (`request-email-verification.use-case.ts`,
`request-password-reset.use-case.ts`) build plain-text bodies inline today;
`SmtpMailSender` passes them through as `text: message.body`. When HTML/template
landings happen, the `EmailMessage` interface grows an optional `html?: string`
and `SmtpMailSender` forwards it — no behavior change to the existing use cases.

### Mailpit compose profiles

Mailpit belongs to profiles `['all', 'infra', 'api', 'mail']`:

- `all` — full stack.
- `infra` — Postgres + Mailpit. Any DB-backed work that touches auth flows
  benefits from having a sink.
- `api` — api needs Mailpit healthy before it can `depends_on` it (the api
  profile pulls Postgres for the same reason).
- `mail` — Mailpit alone, for inbox-only inspection.

The `web` profile does not include Mailpit; the web app does not send mail.

### `depends_on` mailpit with healthcheck

The api `depends_on: { mailpit: { condition: service_healthy } }`. Mailpit
exposes `GET /api/v1/info` which doubles as a liveness probe:
`wget -qO- http://localhost:8025/api/v1/info`. Without the healthcheck, the
api can start, attempt to send mail in a boot path (none today, but future
proofing), and race the Mailpit listener.

## Components

```
apps/api/
├── src/
│   ├── api.config.ts                              [+ mail.* schema + env mapping]
│   └── modules/identity/
│       ├── identity.module.ts                     [+ buildMailSender factory, swap provider]
│       └── core/mail/
│           ├── mail-sender.ts                     [unchanged — abstract port]
│           ├── console-mail-sender.ts             [unchanged — fallback]
│           ├── smtp-mail-sender.ts                [NEW]
│           └── email-message.ts                   [unchanged]
├── package.json                                   [+ nodemailer, + @types/nodemailer]
└── (tests below)

deploy/
├── docker-compose.yml                             [+ mailpit service, + smtp env on api, + depends_on]
```

### `SmtpMailSender` shape

```ts
import type { Config } from '@kizunu/api/api.config'
import { ConfigService } from '@kizunu/config-module/config.service'
import { Injectable, Logger } from '@nestjs/common'
import { createTransport, type Transporter } from 'nodemailer'

import type { EmailMessage } from './email-message'
import { MailSender } from './mail-sender'

@Injectable()
export class SmtpMailSender extends MailSender {
  private readonly logger = new Logger(SmtpMailSender.name)
  private readonly transporter: Transporter
  private readonly from: string

  constructor(config: ConfigService<Config>) {
    super()
    const host = config.get('mail.smtpHost')
    const port = config.get('mail.smtpPort')
    const user = config.get('mail.smtpUser')
    const password = config.get('mail.smtpPassword')
    const secure = config.get('mail.smtpSecure')
    this.from = config.get('mail.from')
    this.transporter = createTransport({
      host,
      port,
      secure,
      auth: user ? { user, pass: password } : undefined,
    })
  }

  async send(message: EmailMessage): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to: message.to,
      subject: message.subject,
      text: message.body,
    })
    this.logger.log(`mail sent to=${message.to} subject="${message.subject}"`)
  }
}
```

### Factory

```ts
// SMTP wins when a host is configured; otherwise dev keeps the console stub.
function buildMailSender(config: ConfigService<Config>): MailSender {
  if (config.get('mail.smtpHost')) {
    return new SmtpMailSender(config)
  }
  return new ConsoleMailSender()
}
```

Wired in `IdentityModule` providers list:

```ts
{ provide: MailSender, inject: [ConfigService], useFactory: buildMailSender },
```

### Config schema

Added inside the existing `configSchema` object:

```ts
mail: z.object({
  smtpHost: z.string().default(''),
  smtpPort: z.coerce.number().int().positive().default(1025),
  smtpUser: z.string().default(''),
  smtpPassword: z.string().default(''),
  smtpSecure: z.stringbool().default(false),
  from: z.string().default('Kizunu <noreply@kizunu.local>'),
}),
```

And read in `load()`:

```ts
mail: {
  smtpHost: process.env.APP_SMTP_HOST,
  smtpPort: process.env.APP_SMTP_PORT,
  smtpUser: process.env.APP_SMTP_USER,
  smtpPassword: process.env.APP_SMTP_PASSWORD,
  smtpSecure: process.env.APP_SMTP_SECURE,
  from: process.env.APP_MAIL_FROM,
},
```

### Compose service

```yaml
mailpit:
  image: axllent/mailpit:latest
  container_name: kizunu-mailpit
  profiles: ['all', 'infra', 'api', 'mail']
  ports:
    - '1025:1025'
    - '8025:8025'
  environment:
    MP_SMTP_AUTH_ACCEPT_ANY: '1'
    MP_SMTP_AUTH_ALLOW_INSECURE: '1'
  healthcheck:
    test: ['CMD', 'wget', '-qO-', 'http://localhost:8025/api/v1/info']
    interval: 5s
    timeout: 5s
    retries: 10
```

Plus the api service:

```yaml
environment:
  APP_SMTP_HOST: mailpit
  APP_SMTP_PORT: '1025'
  APP_SMTP_USER: ''
  APP_SMTP_PASSWORD: ''
  APP_SMTP_SECURE: 'false'
  APP_MAIL_FROM: 'Kizunu <noreply@kizunu.local>'
depends_on:
  postgres:
    condition: service_healthy
  mailpit:
    condition: service_healthy
```

## Sequence: developer hits "forgot password"

```
User                Web (3000)        API (3001)         SmtpMailSender   Mailpit (1025/8025)
 │                    │                   │                    │                    │
 │ submit email       │                   │                    │                    │
 │───────────────────▶│                   │                    │                    │
 │                    │ POST /auth/       │                    │                    │
 │                    │ password-reset    │                    │                    │
 │                    │──────────────────▶│                    │                    │
 │                    │                   │ mint hashed token  │                    │
 │                    │                   │──┐ (DB)            │                    │
 │                    │                   │◀─┘                 │                    │
 │                    │                   │ send(msg)          │                    │
 │                    │                   │───────────────────▶│                    │
 │                    │                   │                    │ SMTP MAIL FROM/RCPT TO/DATA │
 │                    │                   │                    │──────────────────▶│
 │                    │                   │                    │◀──────────────────│ 250 OK
 │                    │                   │◀───────────────────│                    │
 │                    │                   │ log mail sent      │                    │
 │                    │◀──────────────────│ 204                │                    │
 │ "Check your inbox" │                   │                    │                    │
 │◀───────────────────│                   │                    │                    │
 │                                                                                  │
 │  open http://localhost:8025 → see message → click reset URL ─────────────────────│
 │                                                                                  │
 │ GET /auth/reset-password?token=... (web)                                         │
 │ POST /auth/password-reset/confirm (api) — replaces hash, revokes sessions        │
```

## Tradeoffs

- **One config block, one transporter** is dead simple but means rotating SMTP
  credentials requires a restart. Acceptable for v0.1; multi-tenant SMTP is a
  cloud concern, not pilot scope.
- **Plain-text only** keeps the contract tiny and matches today's use cases.
  When templates land, `EmailMessage` can grow optional fields without
  breaking the abstraction. Doing it now would build an HTML pipeline with no
  caller.
- **Mailpit pinned to `:latest`** in dev compose. The dev stack is allowed to
  drift; production SMTP runs against the operator's chosen server, so a
  pinned dev image buys nothing. Other dev images in the same file
  (`postgres:16-alpine`) are pinned because the schema cares about the major;
  Mailpit is a black-box test inbox.
- **No retry / queue inside `SmtpMailSender`.** A reject becomes a use-case
  failure → 5xx (`ApplicationExceptionFilter` shape). The hashed token has
  still been persisted, so the user can retry from the UI. This preserves
  exactly today's behavior of the use cases that touch the `MailSender` — no
  surprise side-effects from the swap.

## Requirement Traceability — Design Coverage

| Requirement ID | Component                                                  |
| -------------- | ---------------------------------------------------------- |
| SMTP-01        | `SmtpMailSender.send` + `mail.*` config                    |
| SMTP-02        | `SmtpMailSender` constructor `auth` branch                 |
| SMTP-03        | `SmtpMailSender` constructor `secure` passthrough          |
| SMTP-04        | `SmtpMailSender.send` rejects propagate; caller surfaces 5xx |
| SMTP-05        | `buildMailSender` factory (empty host → `ConsoleMailSender`) |
| SMTP-06        | `deploy/docker-compose.yml` mailpit service                |
| SMTP-07        | `api` service `depends_on: { mailpit: service_healthy }`   |
| SMTP-08        | `APP_WEB_URL` already in api env; use case bodies already build a `localhost:3000/auth/...` URL — no change needed |
| SMTP-09        | `profiles: ['all', 'infra', 'api', 'mail']` on mailpit     |

All 9 requirements have a designated component.
