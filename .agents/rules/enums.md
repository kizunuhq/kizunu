# Enum-Like Vocabularies

These rules apply across the monorepo — `apps/` (both `api` and `web`) and the
shared `packages/`. A "closed vocabulary" is a small, fixed set of named values
that the code branches on or annotates against (event types, status codes,
field types, plugin capabilities, and so on). This rule is **not** script-gated;
review and the typechecker enforce it. Rationale lives in
[`docs/adr/002-enum-as-const-object.md`](../../docs/adr/002-enum-as-const-object.md).

## 1. Default: `const` Object + Derived Type

Define a closed vocabulary as a `const` object literal and derive the type from
it (declaration merging — the value and the type share the same name). This
gives both **named access at the call site** (`X.Invitation`) and **type
annotations** (`type X = ...`) from a single source.

Bad — native `enum` (emits runtime, nominal typing, awkward reverse mapping):

```ts
export enum VerificationTokenType {
  EmailVerification = 'email_verification',
  PasswordReset = 'password_reset',
  Invitation = 'invitation',
}
```

Bad — bare literal union (no accessible values; every call site uses a magic
string):

```ts
export type VerificationTokenType =
  | 'email_verification'
  | 'password_reset'
  | 'invitation'

// Callers must write the literal everywhere:
sendToken({ type: 'email_verification' })
```

Good — `const` object + derived type:

```ts
export const VerificationTokenType = {
  EmailVerification: 'email_verification',
  PasswordReset: 'password_reset',
  Invitation: 'invitation',
} as const

export type VerificationTokenType =
  (typeof VerificationTokenType)[keyof typeof VerificationTokenType]

// Call sites use named values; renaming a key catches every usage:
sendToken({ type: VerificationTokenType.EmailVerification })
```

In-repo canonical examples:

- `apps/api/src/modules/workspace/core/domain/verification-token.ts` (`VerificationTokenType`)
- `apps/api/src/modules/engine/core/domain/journey-event.ts` (`JourneyEvent`)
- `apps/api/src/modules/engine/core/domain/lead-journey-status.ts` (`LeadJourneyStatus`)

Sub-rules:

- **One vocabulary per file.** Code-standards rule #11 ("one type per file")
  applies — the const object + derived type pair counts as one cohesive
  declaration and lives in its own kebab-case file named after the type.
- **PascalCase keys.** The object's keys are PascalCase identifiers
  (`PaymentSucceeded`), even though the values are usually kebab-case or
  snake_case strings on the wire (`'payment.succeeded'`, `'email_verification'`).
- **No abbreviations.** Spell out the key (`PaymentSucceeded`, not
  `PaymentSuccd`); a typo in a key propagates everywhere the vocabulary is
  used.

## 2. Extension: Discriminated Dispatch via `PayloadMap`

When each vocabulary value carries a **different payload shape**, pair the
const object with a `PayloadMap` type and a generic `Handler<T extends X>`.
The compiler narrows `payload` automatically per `T` — no casts, no
`payload as PaymentSucceededPayload`, no runtime type guards.

```ts
export const WebhookEvent = {
  PaymentSucceeded: 'payment.succeeded',
  PaymentFailed: 'payment.failed',
  RefundCreated: 'refund.created',
} as const

export type WebhookEvent =
  (typeof WebhookEvent)[keyof typeof WebhookEvent]

export type WebhookPayloadMap = {
  [WebhookEvent.PaymentSucceeded]: { chargeId: string; amount: number }
  [WebhookEvent.PaymentFailed]: { chargeId: string; reason: string }
  [WebhookEvent.RefundCreated]: { refundId: string; amount: number }
}

export type WebhookHandler<T extends WebhookEvent> = (
  payload: WebhookPayloadMap[T],
) => void
```

How the three shapes refer to the same vocabulary:

- `WebhookEvent.PaymentSucceeded` is the **value** — the string `'payment.succeeded'` at runtime.
- `typeof WebhookEvent.PaymentSucceeded` is the **literal type** of that one value — the type `'payment.succeeded'`. Use this to type a handler that only accepts one event.
- `WebhookEvent` on its own is **both** the const object and the union type
  `'payment.succeeded' | 'payment.failed' | 'refund.created'`, thanks to
  declaration merging. Use this when a function accepts any event.

Good — narrow handlers receive a narrowed payload:

```ts
const onPaymentSucceeded: WebhookHandler<typeof WebhookEvent.PaymentSucceeded> = (payload) => {
  // payload -> { chargeId: string; amount: number }
  console.log(`Charge ${payload.chargeId} collected ${payload.amount}`)
}

const onPaymentFailed: WebhookHandler<typeof WebhookEvent.PaymentFailed> = (payload) => {
  // payload -> { chargeId: string; reason: string }
  console.log(`Charge ${payload.chargeId} failed: ${payload.reason}`)
}
```

Bad — accessing a key not present on the narrowed payload is caught at compile
time, not runtime:

```ts
const onRefundCreated: WebhookHandler<typeof WebhookEvent.RefundCreated> = (payload) => {
  // Compile error: Property 'chargeId' does not exist on type
  // '{ refundId: string; amount: number }'.
  console.log(`Refund ${payload.chargeId}`)
}
```

A router that accepts any event uses the broader form `Handler<WebhookEvent>`.
The payload then becomes the discriminated union of every shape in the map, and
the router narrows by checking the event key:

```ts
function dispatch<T extends WebhookEvent>(event: T, payload: WebhookPayloadMap[T]): void {
  if (event === WebhookEvent.PaymentSucceeded) {
    // payload narrows to { chargeId: string; amount: number }
    return onPaymentSucceeded(payload as WebhookPayloadMap[typeof WebhookEvent.PaymentSucceeded])
  }
  // …other branches
}
```

The single cast at the router boundary is the price of dispatching dynamically;
every handler downstream stays cast-free.

When to reach for `PayloadMap`:

- A webhook router, event bus, or message handler where each event type carries
  its own fields.
- A discriminated CRM/channel action dispatcher (`onReply`, `onExhausted`,
  `move_stage`, `mark_lost`, etc.) where each action key takes different
  parameters.
- Anywhere you'd otherwise write `if (event === 'X') { (payload as XPayload)... }`.

When **not** to reach for it: if all values share the same payload, you don't
need the map — the plain `Handler = (payload: SharedPayload) => void` is
clearer.

## 3. Exceptions: When a Bare Union Is Fine

The const-object pattern is overkill when callers never reference a named
value — they always inline the literal. Two narrow cases qualify:

### 3.1 React component-prop variant types

JSX call sites write the literal inline (`<Mark variant="full" />`). Forcing
`<Mark variant={MarkVariant.Full} />` would add an import and obscure the
prop. A bare union is the React-community idiom (shadcn's own primitives use
it).

```ts
// apps/web/src/features/marketing/components/kizunu-mark.tsx
export type MarkVariant = 'full' | 'scanned'

interface KizunuMarkProps {
  variant?: MarkVariant
}
```

Boundary: applies only when the type is a **component prop discriminator**.
A domain vocabulary that the web also uses (e.g. `LeadJourneyStatus` on a
filter) still follows rule §1.

### 3.2 Internal narrowings of well-known external vocabularies

A type that mirrors a widely-known external string vocabulary (HTTP verbs,
MIME-type prefixes, ISO language codes) and is used only internally to narrow
a parameter that callers naturally write inline. Promoting to a const object
adds noise without adding refactoring safety — nobody is going to rename
`'GET'` to `'GIT'`.

```ts
// packages/api-client/src/client/api-client.ts
type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE'

interface RequestInit {
  method?: HttpMethod
}
```

Boundary: applies only when (a) the vocabulary is universally known outside
this codebase and (b) the type is internal — exported only as a parameter type,
never as something call sites would symbolically reference. A domain
vocabulary that *happens* to overlap with an external one still follows §1.

When in doubt, follow §1. The exceptions exist to prevent over-engineering
two-value React props and HTTP-verb narrowings — not as a general escape
hatch.

## 4. Related

- **ADR-002**: [`docs/adr/002-enum-as-const-object.md`](../../docs/adr/002-enum-as-const-object.md) — the decision and its rationale.
- **ADR-003**: domain owns the vocabulary; infra (Drizzle `pgEnum`) conforms via
  a compile-time `Assert<Equal<...>>` guard from `@kizunu/nestjs-shared`.
- **Canonical files** to copy when introducing a new vocabulary:
  - `apps/api/src/modules/workspace/core/domain/verification-token.ts`
  - `apps/api/src/modules/engine/core/domain/journey-event.ts`
  - `apps/api/src/modules/engine/core/domain/lead-journey-status.ts`
- **Code-standards rule #11** (one type per file) — also applies to the const
  object + derived type pair.
