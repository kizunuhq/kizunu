# Observability — wide events via `evlog`

These rules apply to `apps/api/` request handlers (controllers, use
cases, services, and anything they call inside the request stack).
They codify how we use [`evlog`](https://github.com/HugoRCD/evlog)
(`evlog/nestjs`) — the project's structured-logging library — to emit
**one wide event per request** that carries every meaningful
correlation field plus the structured-error envelope when something
fails.

This rule is **not** script-gated; review enforces it. The library is
new and small; the in-repo research bundle at
`.specs/research/observability-evlog/` (commit-pinned upstream
snippets + distilled `context.md`) is the canonical deep reference.
ADR-009 records why we chose `evlog` over the alternatives.

## 1. One Wide Event Per Request

The evlog middleware (registered in `ApiModule` via
`EvlogModule.forRootAsync(...)`) creates one logger per request, scoped
through AsyncLocalStorage. It emits exactly one JSON line on stdout at
response close, with `method`, `path`, `status`, `duration`,
`requestId`, and any context the handler added via
`useLogger().set(...)`.

**Do not** add `console.log` / `console.error` / `console.warn` inside
request handlers. They produce interleaved lines that lose request
correlation and bypass redaction.

Bad — scattered console output:

```ts
@Post(':id/...')
async connect(@Param('id') workspaceId: string, @Body() body: ConnectDto) {
  console.log('connect requested', workspaceId)
  const result = await this.useCase.execute(...)
  console.log('connect completed', result.id)
  return result
}
```

Good — accumulate context onto the request's wide event:

```ts
import { useLogger } from 'evlog/nestjs'

@Post(':id/...')
async connect(@Param('id') workspaceId: string, @Body() body: ConnectDto) {
  useLogger().set({ workspaceId })
  return await this.useCase.execute(...)
}
```

## 2. Enrich, Don't Replace — `ApplicationException` Stays The Wire

Domain errors throw `ApplicationException` subclasses with a
dot-namespaced `code`, a message, and an optional structured `context`.
The HTTP response envelope is **frozen** at `{ code, message, context }`
(see `@kizunu/api-contracts`). `ApplicationExceptionFilter` renders that
envelope **and** calls `useLogger().error(exception)` so the request's
wide event carries the structured error alongside its other context.
There is no second log line.

Unhandled (non-`ApplicationException`) throws hit the new
`UnhandledExceptionFilter` (last-resort `@Catch()`), which captures
the throw into the wide event and then delegates to
`BaseExceptionFilter` (`@nestjs/core`) so Nest's default rendering
applies — `HttpException` subclasses (`UnauthorizedException`,
`NotFoundException`, etc.) keep their mapped status, anything else
becomes a 500.

**Do not** throw `createError(...)` (evlog's structured-error
constructor) from a domain use case. It would render the evlog wire
envelope (`{ message, why, fix, link }`) to the HTTP response and
break the api-contracts. `createError` is reserved for boot-time or
out-of-request paths the spike does not address.

Bad — would break the HTTP contract:

```ts
import { createError } from 'evlog'

throw createError({
  message: 'OAuth code exchange failed',
  status: 422,
  why: 'Short-lived code expired',
})
```

Good — domain error, plus an opt-in `why`/`fix` enrichment on the
wide event (without leaking to the HTTP body):

```ts
class MetaCoexCodeExpiredException extends ApplicationException {
  constructor() {
    super('channel.meta.coex.code-expired', 'OAuth code expired', 422)
  }
}

throw new MetaCoexCodeExpiredException()
```

(If a future feature wants `why`/`fix` on the wide event for that
exception, extend `ApplicationException` to carry those fields and
read them in the filter — never on the HTTP response.)

## 3. Redaction Is Mandatory For Credentials

The central enricher in
`apps/api/src/shared/observability/evlog-options.ts` walks
`event.{input,request,body,credentials}` before emit and masks any key
in `REDACTION_KEYS` to `'[redacted]'`. Today's vocabulary:

```ts
export const REDACTION_KEYS = [
  'credentials',
  'accessToken',
  'appSecret',
  'verifyToken',
  'client_secret',
  'code',
] as const
```

Contributors do not need to redact at the call site — the enricher
handles it. **What to do** when adding a new credential-bearing field:
extend `REDACTION_KEYS` in the same PR that introduces the field. Do
not promote a credential to a top-level wide-event field (top-level
keys are not in the redaction scope by design — `error.code` is
signal, not a secret).

Bad — leaking the OAuth code to the top level:

```ts
useLogger().set({ code: input.code })
```

Good — keep credentials under a scoped path the enricher walks:

```ts
useLogger().set({ input: { ... } })   // event.input.code is redacted
```

## 4. Step Markers For Multi-Phase Use Cases

A use case with three or more observable phases attaches one
kebab-case `step` marker per phase via `useLogger().set({ step: '...' })`.
Canonical example —
`apps/api/src/modules/channel/core/use-cases/connect-meta-coex.use-case.ts`:

```ts
const log = useLogger()
log.set({ workspaceId: input.workspaceId, pluginId: MetaPluginId.Coex })

log.set({ step: 'assert-configured' })
const meta = this.assertConfigured()

log.set({ step: 'oauth-exchange' })
const token = await this.exchange(meta, input.code)

log.set({ step: 'coex-finalize' })
// ...
```

The latest `step` value is the one that lands on the wide event — a
failed request's event shows the phase that was running when it threw,
without per-step millisecond timing (the event already carries the
request's total `duration`).

## 5. What Not To Put On A Wide Event

- **High-cardinality raw user input** (an email, an arbitrary
  description string, a free-form `body` field) directly as a
  top-level key — promotes cardinality without signal. Group under
  one `input` key, or attach only the derived value (a sanitized
  domain, a length, a class).
- **Anything the redaction enricher would mask anyway** — there is no
  reason to attach an `accessToken` even if you trust it would get
  redacted; do not write it in the first place.
- **Stack traces** as top-level fields. `useLogger().error(err)`
  already attaches the parsed envelope; do not also `log.set({ stack })`.
- **PII without a redaction key.** Add the key to `REDACTION_KEYS`
  first, then the field.

## 6. When `createError` Is — and Is Not — Used

| Path | Throw | Why |
| --- | --- | --- |
| Domain use case in the request stack | `ApplicationException` subclass | `{ code, message, context }` wire is frozen; nominated errors. |
| Boot-time (`apps/api/src/main.ts` lifecycle handlers) | `console.error` for now | No request scope, `useLogger()` would throw. Future improvement: a boot-scoped logger. |
| A third-party library threw plain `Error` and we caught it | rethrow as an `ApplicationException` subclass | Same wire reason. |
| A test that wants to assert on the evlog error envelope | `createError(...)` is fine | Tests are out-of-band. |

The line is simple: **never let `createError` reach the HTTP wire.**

## 7. Related

- **`.specs/research/observability-evlog/`** — commit-pinned evlog
  snippets + distilled context for deep questions.
- **ADR-009 — Wide-event observability via `evlog`** — the decision
  + alternatives weighed + the deferred OTLP / Monoscope drain.
- **`comments.md`** — wide events are how the codebase carries *why*
  for runtime behavior; comments are still reserved for non-obvious
  invariants in the code itself.
- **`react.md` § 0** — the sibling "first install from the library,
  customize in place" rule for `apps/web` primitives.
