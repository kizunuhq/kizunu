# Comment Standards

These rules apply across the monorepo — `apps/` (both `api` and `web`) and the
shared `packages/`. They build on the AGENTS.md style basic _"Prefer
self-explanatory code; comment why, not what."_ and codify it into reviewable
guidance. This rule is **not** script-gated; review and the typechecker enforce
it.

## 1. Default: Write No Comments

Well-named identifiers, small functions (rule §10 in `code-standards.md`), and
explicit types already describe **what** code does. A comment that restates the
code adds noise without adding meaning — if removing the comment would not
confuse a future reader, do not write it.

Bad — restates the code:

```ts
// Increment failed attempts and lock the user if the threshold was reached.
const attempts = await this.users.incrementFailedAttempts(user.id)
if (attempts >= maxFailedAttempts) {
  await this.users.lockUntil(user.id, lockoutDeadline)
}
```

Good — the code reads cleanly without narration:

```ts
const attempts = await this.users.incrementFailedAttempts(user.id)
if (attempts >= maxFailedAttempts) {
  await this.users.lockUntil(user.id, lockoutDeadline)
}
```

## 2. Allow Comments Only When The _Why_ Is Non-Obvious

A comment earns its place only when it explains something the reader cannot
derive from the code itself. The qualifying cases are narrow:

- **Hidden constraint or invariant** that the type system cannot express.
- **Workaround for a specific bug, library quirk, or platform limitation** —
  name the system being worked around so the reader can check whether the
  workaround is still needed.
- **Security, timing, or correctness reasoning** that would otherwise tempt a
  reader to "simplify" the code into a vulnerability or regression.
- **Behavior that would surprise a reader** — e.g. an intentional fall-through,
  a deliberate no-op, an early return that exists for ordering reasons.

Good — security reasoning that protects the code from a well-meaning refactor:

```ts
if (!user) {
  // Hash a throwaway value to keep timing roughly constant against
  // unknown-email vs known-email probing.
  await hashPassword(input.password)
  throw new InvalidCredentialsException()
}
```

Good — names the external system being worked around:

```ts
// z.stringbool() (not z.coerce.boolean(), which maps the string "false" to true).
const registrationEnabled = z.stringbool().default(true)
```

Lead with the _why_, not the _what_. If the comment starts with "This function
…" or "Loop over the items …", it is a what-comment — delete it and let the
code speak.

## 3. Do Not Reference Tasks, PRs, Issues, Or Past Work

The PR description, commit message, and issue tracker are the canonical homes
for "added for feature X", "fix for #123", or "see the Linear ticket". Such
references rot the moment the code moves: the function gets renamed, the caller
changes, the issue closes, and the comment lies. Trust git history (`git log`,
`git blame`) and the PR system to carry that context.

Bad:

```ts
// Added for feature 029 (auto-subscribe). See PR #54.
async function subscribeWebhook(account: ChannelAccount) { ... }
```

Bad:

```ts
// TODO(@alice): rewrite once the new poller lands — see KIZ-217
function pollJourneys() { ... }
```

Good — name the action; if it must be tracked, open an issue:

```ts
function pollJourneys() { ... }
```

## 4. No Section Headers Or Structural Markers

Section dividers, banner comments, and test-phase markers (`// Arrange`,
`// Act`, `// Assert`, `// Given/When/Then`, `// Setup`, `// Summary`) are
what-comments dressed up as organization. The structure they describe is
already visible from blank lines, `describe`/`it` blocks, and function
boundaries. Drop the markers and let the visual rhythm carry the structure.

`test.md` §3 mandates that tests follow a clear setup/action/assertion
**structure** — it does not mandate writing the phase names as comments. Keep
the structure; drop the labels.

Bad:

```ts
it('marks an invoice as paid', () => {
  // Arrange
  const invoice = createInvoice({ status: 'open' })

  // Act
  invoice.pay()

  // Assert
  expect(invoice.status).toBe('paid')
})
```

Good — blank lines already mark the phases:

```ts
it('marks an invoice as paid', () => {
  const invoice = createInvoice({ status: 'open' })

  invoice.pay()

  expect(invoice.status).toBe('paid')
})
```

## 5. JSDoc Only For Tool-Surfaced Public API

JSDoc (`/** ... */`) is reserved for declarations whose docstring is consumed
by an external surface — IDE hover/IntelliSense for an exported library symbol,
OpenAPI/`@nestjs/swagger` description metadata, schema documentation rendered
from `.describe(...)`. Internal helpers, private methods, and one-off types do
not need JSDoc; a self-explanatory name is enough.

If you write JSDoc, it must obey the same _why-not-what_ rule as line
comments: one sentence on the contract, the constraint, or the surprising
behavior — never a restatement of the signature.

Good — exported library symbol whose hover hint appears across the repo:

```ts
/**
 * Returns null when the string is not a JSON object, rather than throwing,
 * so call sites can branch without try/catch around every parse.
 */
export function parseJsonObject(raw: string): Record<string, unknown> | null { ... }
```

Bad — restates the signature, adds no information beyond the types:

```ts
/**
 * Lists all sessions for the given user.
 *
 * @param userId The user id.
 * @returns A list of sessions.
 */
function listSessions(userId: string): Promise<Session[]> { ... }
```

## 6. Generated Files Are Exempt

Comments inside generated artifacts are owned by the generator, not by this
rule:

- `apps/web/src/routeTree.gen.ts` (TanStack Router codegen)
- `apps/api/drizzle/*` (Drizzle migrations and snapshots)
- Any other file whose header marks it as generated.

Do not edit those comments by hand; regenerate the file through its tool
instead.

## 7. Related

- **AGENTS.md** style basic: _Prefer self-explanatory code; comment why, not what._
- **code-standards.md** §10 (functions under 30 lines) — small functions need
  fewer comments because the name already describes the body.
- **test.md** §3 (Arrange/Act/Assert structure) — keep the structure, drop the
  phase labels.
