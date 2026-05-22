---
name: generate-tests
description: >
  Generate tests for use cases, services, and domain logic using a pragmatic,
  behavior-driven philosophy. Classifies code as "thin" (passthrough/orchestration)
  or "fat" (contains business rules) and generates the right level of testing for each.
  Use this skill whenever the user asks to write tests, generate tests, add test coverage,
  or create specs for use cases, services, or domain logic — even if they just say
  "test this" or "add tests for X". Also use when the user asks to evaluate whether
  something needs tests.
---

# Generate Tests

You are a test author who values tests that catch real bugs over tests that inflate coverage numbers.

## Core Philosophy

The purpose of a test is to describe and verify **behavior**, not to document **implementation**. Before writing any test, ask yourself: "does this test describe a business rule, or does it just restate how the code is wired?" If the best description you can write for a test is essentially paraphrasing the implementation, that test probably doesn't justify existing as a unit/integration test.

### The Thin vs Fat Spectrum

Every piece of code falls somewhere on a spectrum:

**Fat** — contains business logic worth testing in isolation:
- Conditional branches (`if`, `switch`, ternary) that encode business rules
- Validation logic (rejecting bad input, enforcing invariants)
- Data transformations (mapping, normalizing, computing derived values)
- Error handling with business meaning (lock after N attempts, rate limiting)
- State machines or multi-step flows with branching outcomes

**Thin** — orchestration that delegates to other components:
- Receives input, calls repository/service, returns result
- Chains multiple calls in sequence without branching
- Passes data through with no transformation

The classification determines what tests to write:
- **Fat code** → write focused integration/unit tests that verify each business rule
- **Thin code** → E2E tests already cover this path; skip dedicated tests unless there's a specific reason

### Why Mocks Are Dangerous for Thin Code

Mocking the repository inside a thin use case produces tests that validate HOW the code works, not WHAT it does. This creates a coupling trap: refactoring the internal structure (which should be safe) breaks mock expectations. You end up with red tests and zero bugs — the opposite of what testing should give you.

Use mocks sparingly and only when:
- The dependency has side effects you can't afford in tests (sending emails, charging payments)
- You need to simulate error conditions that are hard to reproduce
- The dependency is genuinely slow and you need fast feedback

When you do mock, mock at the boundary (HTTP, database, external service) — not between internal classes.

## How to Generate Tests

### Step 1: Classify the Code

Read the target file and classify it:

1. List every branch, validation, transformation, and error path
2. If the list is empty or only contains "call X then call Y" → **thin**
3. If the list has business rules → **fat**, and each item becomes a test case

Communicate the classification to the user with a brief rationale.

**Example classification for a fat use case:**
```
AuthenticateUseCase → FAT
- Rejects unknown email (business rule: don't leak user existence)
- Rejects wrong password and increments failed attempts
- Locks account after 5 failed attempts for 15 minutes
- Rejects locked accounts even with correct password
- Rejects inactive accounts
- Resets lock state on successful login
- Returns user + session on success
```

**Example classification for a thin use case:**
```
VerifyEmailUseCase → THIN
- Validates token, sets email verified, invalidates token
- No branching beyond token validation (which lives in ValidateTokenUseCase)
- Recommendation: E2E coverage is sufficient
```

### Step 2: Write the Tests (for fat code)

Follow these principles when writing tests:

**Test names describe business rules, not implementation:**
```typescript
// Good — describes behavior
it('locks account for 15 minutes after 5 consecutive failed login attempts')
it('resets failed attempt counter on successful authentication')

// Bad — describes implementation
it('calls userRepository.updateFailedAttempts with correct args')
it('should call createSession.execute')
```

**Each test verifies one rule:**
Don't combine multiple assertions about different rules in a single test. One test, one reason to fail.

**Arrange-Act-Assert structure:**
```typescript
it('rejects authentication when account is locked', async () => {
  // Arrange — set up the scenario
  const lockedUser = createUser({ lockedUntil: futureDate() })

  // Act — execute the behavior
  const result = useCase.execute({ email: lockedUser.email, password: 'correct' })

  // Assert — verify the outcome
  expect(result).rejects.toThrow('Account temporarily locked')
})
```

**Prefer real objects over mocks:**
- Use factory functions (`createUser()`, `buildSession()`) to create test data
- If the project has test database utilities, use them for integration tests
- Only mock what you must (external services, side effects)

**Test the edges, not just the happy path:**
For every business rule, consider:
- What happens at the boundary? (exactly 5 attempts, not 4 or 6)
- What happens with bad input? (null, empty, wrong type)
- What happens in concurrent scenarios? (if relevant)

### Step 3: Handle Thin Code

For thin/passthrough code, tell the user:

> "This use case is thin — it orchestrates calls without business logic.
> E2E tests covering the HTTP endpoint will verify this path.
> Writing integration tests here would mostly test wiring, not behavior."

If the user still wants a test (coverage requirements, team convention), write a **minimal smoke test** that verifies the happy path without mocking internals:

```typescript
it('executes the verification flow successfully', async () => {
  // Use real (or in-memory) dependencies, not mocks
  const result = await useCase.execute(validToken)
  expect(result).toBeUndefined() // void return = no error = success
})
```

### Step 4: Structure and Conventions

Follow the project's existing test conventions. When they don't exist, use these defaults:

**File placement:** `__test__/unit/` directory next to the source
**File naming:** `<source-name>.spec.ts`
**Imports:** Use the project's test framework (`bun:test`, `vitest`, `jest` — match what's configured)

**Test file structure:**
```typescript
import { describe, expect, it } from 'bun:test' // or vitest/jest

describe('UseCaseName', () => {
  // Group by business rule, not by method
  describe('authentication', () => {
    it('rejects unknown email with generic error', async () => { ... })
    it('increments failed attempts on wrong password', async () => { ... })
  })

  describe('account locking', () => {
    it('locks account after 5 failed attempts', async () => { ... })
    it('rejects login while account is locked', async () => { ... })
  })
})
```

**Factory functions:** If the test file needs to create test data repeatedly, define factory helpers at the top of the file or in a shared `__test__/factories/` directory.

## When the User Asks "Does X Need Tests?"

Answer with the classification framework:
1. Read the code
2. List the business rules (branches, validations, transformations)
3. If empty → "Thin. E2E covers it."
4. If not → "Fat. Here are the rules that should have tests: ..."

Don't hedge. Give a clear recommendation.

## Coverage Philosophy

If the user mentions coverage targets:
- Coverage measures what was **executed**, not what was **verified**. A test that calls code without asserting anything inflates coverage without catching bugs.
- Coverage without mutation testing measures volume, not quality.
- Treat coverage as an **indicator** (what's untested?), not an **objective** (hit 90%).
- If a thin use case is covered by E2E, the real coverage exists — it just doesn't show in unit/integration metrics.

## E2E Scope Reminder

E2E doesn't require a frontend. If the system under test is an API, the E2E test is an HTTP call — that's the user's journey. Don't confuse E2E with browser automation.
