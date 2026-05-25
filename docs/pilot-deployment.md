# Pilot deployment readiness

> The minimum first-customer deployment path. Feature `082` of Phase 2.1.

A v1.0 pilot deployment is a single API instance + a single web instance
talking to a single Postgres. The operator can run this on one box.

## Topology

```
       ┌──────────────────────────┐
       │     HTTPS load balancer  │
       │  (or NGINX / Caddy + ACME)│
       └─────────────┬────────────┘
                     │ /api/*     │ /*
              ┌──────┴─────┐ ┌────┴──────┐
              │ apps/api    │ │ apps/web │
              │ NestJS, 3001│ │ Vite, 5173│
              └──────┬──────┘ └────────────┘
                     │
              ┌──────┴──────┐
              │  Postgres   │
              │  + Mailpit  │ (dev only — production swaps SMTP)
              └─────────────┘
```

The deploy story is documented at the level of detail the pilot
operator needs to *land* the pilot; it intentionally does not cover
managed-cloud, multi-tenant, or autoscaling concerns.

## Required env vars (api)

| Variable | Purpose | Example |
| --- | --- | --- |
| `APP_DATABASE_URL` | Postgres connection string | `postgres://kizunu:secret@db:5432/kizunu` |
| `APP_PORT` | API HTTP port | `3001` |
| `APP_BASE_URL` | Public origin for outbound URLs (webhook callbacks, password-reset links) | `https://kizunu.acme.com` |
| `APP_SESSION_SECRET` | Cookie signing secret | 64-byte hex |
| `APP_CREDENTIALS_ENCRYPTION_KEY` | AES-256-GCM key for credentials at rest (feature `030`) | 32-byte base64 |
| `DISABLE_USER_REGISTRATION` | After registering the first admin, set to `true` (feature `022`) | `false` initially |
| `APP_META_APP_ID` / `APP_META_APP_SECRET` / `APP_META_COEX_CONFIG_ID` | Coexistence onboarding (feature `031`) | — |
| `APP_SMTP_HOST` / `APP_SMTP_PORT` / `APP_SMTP_USER` / `APP_SMTP_PASSWORD` / `APP_SMTP_SECURE` / `APP_MAIL_FROM` | Production mail transport (feature `040`) | — |

See `apps/api/.env.example` for the full list.

## Required env vars (web)

The web app is a static SPA built by Vite; it reads no env vars at
runtime. The API base URL is same-origin via the LB.

## HTTPS + reachable webhooks

Pipedrive and Meta must reach the API over HTTPS:

- Pipedrive CRM webhook: `POST https://kizunu.acme.com/webhooks/crm/:connectorAccountId?token=<hex>` (verified in feature `053`).
- Meta inbound webhook: `GET|POST https://kizunu.acme.com/webhooks/meta/:channelAccountId` (verify-token per-row, feature `029`).

Both must be reachable from the public internet. A self-signed TLS
certificate will fail Meta's webhook verification — use Let's Encrypt
or a paid cert.

## Migration procedure

Migrations are managed by drizzle-kit. On boot, the API does **not**
auto-run migrations (CONCERNS still tracks this). Before deploying a
new image:

```bash
docker run --rm \
  -e APP_DATABASE_URL=$DB_URL \
  ghcr.io/kizunuhq/kizunu-api:<sha> \
  bun --cwd /app/apps/api db:migrate
```

Once green, start the new web + api containers.

## Backup / restore

Postgres is the only source of truth. `pg_dump` nightly into the
operator's backup target of choice (S3, B2, BorgBase). For the v1.0
pilot a daily logical dump retained for 14 days is sufficient.

Encrypted `credentials` JSONB columns require the same
`APP_CREDENTIALS_ENCRYPTION_KEY` for restore — keep the key out of the
backup bundle and in a secrets manager.

## Log access for support

The API logs structured JSON to stdout. Pipe through the container
runtime's log driver (Docker `json-file` rotated, journald, etc.). For
the pilot, an operator can `docker logs --tail 1000 kizunu-api` to grab
the recent slice for support.

## Out-of-scope (deferred to a future deploy slice — feature `028`)

- Kamal-driven blue-green rollout.
- Autoscaling.
- Managed-cloud onboarding.
