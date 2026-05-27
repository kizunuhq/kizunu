# `evlog` — distilled context

All claims here are backed by a snippet in `snippets/`; line references point
into the commit-pinned copies under `snippets/evlog-package-src/`.

## Package & version

- npm name: `evlog`
- pinned version this research targets: **`2.18.1`** (latest at 2026-05-25 per
  `snippets/evlog-package-src/package.json`)
- License: MIT
- Public entry points used in the spike:
  - `evlog` — `createError`, `parseError`, `useLogger` (browser/server
    isomorphic), `initLogger`
  - `evlog/nestjs` — `EvlogModule`, `useLogger`
  - `evlog/fs` — `createFsDrain` (only if we want disk in addition to stdout)

## Wide-event shape (on the wire)

One JSON object per request, emitted at response close. Canonical fields
([`packages/evlog/src/types.ts` → `BaseWideEvent`](snippets/evlog-package-src/types.ts)):

```json
{
  "timestamp": "2026-05-25T10:23:45.612Z",
  "level": "info",
  "service": "my-app",
  "environment": "production",
  "version": "1.4.0",
  "method": "POST",
  "path": "/api/checkout",
  "status": 200,
  "duration": "1.2s",
  "requestId": "req_123",
  "traceId": "...",
  "spanId": "..."
}
```

Any field set via `log.set({ ... })` becomes part of the same event. Errors
serialize to an `error: { message, why?, fix?, link?, code?, status }` block.
The middleware writes one line per request — never an interleaved sequence.

## Default output channel

When **no drain** is configured, `evlog/logger.ts:240` runs
`console[level](JSON.stringify(formatted))`. That means: out of the box, the
wide event lands on `process.stdout` (or `.stderr` for `error`-level) as
JSON-encoded NDJSON. This is exactly the stdout/JSONL behavior the spike
wants in a container — no drain needed for v0.

`silent: true` in `LoggerConfig` (`types.ts:310`) suppresses that built-in
console output; reach for it once a real drain is attached.

## NestJS adapter (the only path we use)

Source: [`snippets/evlog-package-src/nestjs-index.ts`](snippets/evlog-package-src/nestjs-index.ts).

### Registration

```ts
import { EvlogModule } from 'evlog/nestjs'

@Module({
  imports: [
    EvlogModule.forRoot({
      // optional. Drain omitted = stdout JSONL via console.*.
      // enrich, exclude, sampling, silent supported as per BaseEvlogOptions.
    }),
  ],
})
export class AppModule {}
```

`forRoot` is `global: true`, so a single import in the root module covers the
whole app. `forRootAsync({ imports, inject, useFactory })` exists for
`ConfigService`-fed configuration; we use it because env-derived
`service` / `environment` / `version` are the Kizunu pattern.

### Per-request logger

Inside the request stack (controller, service, anything called from a
controller handler):

```ts
import { useLogger } from 'evlog/nestjs'

const log = useLogger()
log.set({ workspaceId, pluginId, step: 'oauth.exchange' })
log.info('exchanged code for token')
log.error(error)            // also attaches the parsed error envelope
```

The middleware also exposes `req.log` (Express request augmentation declared in
`nestjs-index.ts:28-38`) for code that already has the request in scope.

### Middleware lifecycle

`createEvlogMiddleware` (`nestjs-index.ts:40-67`):

1. Extracts safe headers + a `requestId` (from `x-request-id` or generated UUID).
2. Builds a `RequestLogger` keyed to that request via AsyncLocalStorage
   (`createLoggerStorage`).
3. Hooks the Node response lifecycle (`bindNodeResponseLifecycle`) so the
   event is emitted exactly once — at response close, including the final
   `status` and `duration`.
4. Calls `next()` inside `storage.run(logger, ...)`, so every `useLogger()`
   downstream returns the same instance.

If the path matches `exclude`, the middleware skips logger creation entirely
(no overhead on health checks / static assets).

## Error envelope

`evlog`'s structured error ([`error.ts`](snippets/evlog-package-src/error.ts)):

```ts
throw createError({
  code: 'META_OAUTH_EXCHANGE_FAILED',
  message: 'OAuth code exchange returned 400',
  status: 422,
  why:  'The short-lived code expired before our server-side exchange ran.',
  fix:  'Restart Embedded Signup and finish within 10 minutes.',
  link: 'https://developers.facebook.com/docs/.../oauth',
  cause: originalError,
  internal: { wabaId, requestId }, // non-enumerable, never serialized
})
```

`internal` is stored on a Symbol-keyed property — it's *omitted* from
`JSON.stringify`, the wide event payload, and any HTTP response. It only ever
shows up in server-side context.

`parseError(error)` accepts anything (an `EvlogError`, a stock `Error`, a
random thrown value) and returns the flat envelope. The example controller
(`snippets/evlog-nestjs-example/app.controller.ts:22-41`) shows the canonical
exception-filter pattern: `useLogger().error(error)` then render the
`{ message, why, fix, link }` payload to the HTTP response with the parsed
status.

## How the spike maps onto Kizunu's existing error model

Kizunu's `ApplicationException` ([`packages/nestjs-shared/src/lib/exceptions/application.exception.ts`](../../../packages/nestjs-shared/src/lib/exceptions/application.exception.ts))
already carries `{ code, message, suggestedHttpStatusCode, context }`. The
spike does **not** replace it — the wire response envelope stays
`{ code, message, context }` (existing api-contracts) so no api-client
breakage. evlog enters at two seams:

1. **Inside `ApplicationExceptionFilter`** — additionally call
   `useLogger().error(exception)` so the wide event carries the structured
   error. Response shape unchanged.
2. **New `@Catch()` last-resort filter** for unhandled non-`ApplicationException`
   throws — captures into the wide event before delegating to Nest's default
   500 handler. Today an unhandled throw inside a use case bubbles to Nest's
   built-in filter with no log line.

`why` / `fix` / `link` enrichment is opt-in per `ApplicationException`
subclass: add an extension carrying those fields, log them from the filter,
*don't* render them in the HTTP response (would break the
`{ code, message, context }` contract). Kept for a follow-up sweep if pilot
operators ask for them.

## Drain options (later phases)

| Drain | Source | When |
| --- | --- | --- |
| stdout JSONL (default `console.*`) | `logger.ts:240` | **The spike's choice.** Containers capture it; no infra required. |
| `createFsDrain` | `adapters/fs.ts` | If we want rolling NDJSON files on disk during local dev. Not in spike scope. |
| `createOTLPDrain` | `adapters/otlp.ts` | The Monoscope path, gated on `028` deploy + S3 decision. |
| `createMemoryDrain` | `adapters/memory.ts` | Tests that want to assert on emitted events. |

## Notable defaults & caveats

- **Sampling:** off (100%) when no `sampling` config is provided. We keep it
  off for the spike on a single low-traffic route. Sweep adds rates later.
- **Sealed loggers:** after `emit()` further `.set/.info/.warn/.error` calls
  are ignored with a `console.warn`. The middleware emits at response close
  — controllers must not call `.emit()` themselves.
- **Redaction:** `redact` config (`types.ts:95`) scrubs sensitive paths before
  console output and before any drain. We will redact at least
  `credentials.*`, `accessToken`, `code`, `verifyToken`, `appSecret` in the
  enricher.
- **AsyncLocalStorage:** the NestJS adapter relies on ALS. Anything spawning
  outside the request stack (`setTimeout`, queue worker, raw Promise resolved
  asynchronously after the response is sent) will lose the context — emit
  before returning, or pass `log` explicitly.
- **No native stdout drain.** "stdout" is achieved by *not* configuring a
  drain (the library's default behavior). If we ever want both stdout and
  another drain, we need to either keep `silent: false` and accept the
  duplication, or build a thin custom drain via `defineDrain` that
  `process.stdout.write`s.
- **Cloudflare-only enrichers** (`cf-ipcountry`, `req.cf.*`) are listed as a
  caveat upstream — irrelevant to Kizunu (Node on Kamal).

## What the spike will and won't validate

| Validates | Defers |
| --- | --- |
| Module wiring + middleware runs on one route end-to-end | Sweep across the rest of `apps/api` |
| `useLogger()` inside a use case captures step-level context | Sampling rules per env |
| `ApplicationException` ↔ evlog error envelope composition | `internal: {}` adoption on every nominated exception |
| stdout JSONL is consumable by `bun dev` and Docker logs | OTLP drain → Monoscope |
| Pre-existing controller tests still pass | New observability-only integration tests beyond what generate-tests prescribes |
