# Test Standards

These rules apply to all automated tests in `frontend/` and `backend/`.

## 1. Cover Code With Tests

Add or update tests when adding features, fixing bugs, or changing behavior. Cover happy paths, important edge cases, and expected failures.

Bad:

```ts
function calculateDiscount(total: number) {
  return total >= 100 ? 10 : 0;
}

// No tests for the threshold behavior.
```

Good:

```ts
describe("calculateDiscount", () => {
  it("returns a discount when the total reaches the threshold", () => {
    expect(calculateDiscount(100)).toBe(10);
  });

  it("does not return a discount below the threshold", () => {
    expect(calculateDiscount(99)).toBe(0);
  });
});
```

## 2. Keep Tests Independent

Each test must be able to run alone or in any order. Do not rely on state created by another test.

Bad:

```ts
let userId: string;

it("creates a user", async () => {
  userId = await createUser({ name: "Ada" });
});

it("loads the created user", async () => {
  const user = await findUser(userId);

  expect(user.name).toBe("Ada");
});
```

Good:

```ts
it("loads an existing user", async () => {
  const userId = await createUser({ name: "Ada" });

  const user = await findUser(userId);

  expect(user.name).toBe("Ada");
});
```

## 3. Structure Tests With Setup, Action, And Assertion Phases

Structure tests with clear setup, action, and assertion phases — either
Arrange/Act/Assert or Given/When/Then — separated by blank lines. Do **not**
write the phase names as comments; the blank-line rhythm already marks the
structure (see `comments.md` §4).

Good:

```ts
it("marks an invoice as paid", () => {
  const invoice = createInvoice({ status: "open" });

  invoice.pay();

  expect(invoice.status).toBe("paid");
});
```

Good:

```ts
it("rejects an expired coupon", () => {
  const coupon = createCoupon({ expiresAt: new Date("2026-01-01T00:00:00.000Z") });

  const result = validateCoupon(coupon, new Date("2026-01-02T00:00:00.000Z"));

  expect(result.isValid).toBe(false);
});
```

## 4. Mock Date When Behavior Depends On Time

Tests for time-dependent behavior must control the current date and time. Do not depend on the real clock.

Bad:

```ts
it("detects expired subscriptions", () => {
  const subscription = createSubscription({ expiresAt: new Date("2026-01-01T00:00:00.000Z") });

  expect(isSubscriptionExpired(subscription)).toBe(true);
});
```

Good:

```ts
afterEach(() => {
  vi.useRealTimers();
});

it("detects expired subscriptions", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-02T00:00:00.000Z"));

  const subscription = createSubscription({ expiresAt: new Date("2026-01-01T00:00:00.000Z") });

  expect(isSubscriptionExpired(subscription)).toBe(true);
});
```

## 5. Keep Test Cases Under 100 Lines

A single `it` or `test` block must stay under 100 lines of code. Extract builders, fixtures, helpers, or nested `describe` blocks when setup becomes too large.

Bad:

```ts
it("creates a complete order", async () => {
  // More than 100 lines of setup, execution, and assertions.
});
```

Good:

```ts
it("creates a complete order", async () => {
  const customer = await createCustomerFixture();
  const product = await createProductFixture();

  const order = await createOrder({ customerId: customer.id, productId: product.id });

  expect(order.status).toBe("created");
});
```

## 6. Make Tests Clear And Objective

Test names must describe the expected behavior. Assertions must verify observable results, not implementation details.

Bad:

```ts
it("works", () => {
  const service = new OrderService();

  expect(service).toBeDefined();
});
```

Good:

```ts
it("rejects an order without items", () => {
  const service = new OrderService();

  expect(() => service.createOrder({ items: [] })).toThrow("Order must have at least one item");
});
```

## 7. Use beforeEach For Similar Scenarios

Use `beforeEach` to prepare repeated setup shared by similar tests. Keep setup local to the smallest relevant `describe` block.

Good:

```ts
describe("OrderService", () => {
  let service: OrderService;

  beforeEach(() => {
    service = new OrderService();
  });

  it("creates an order with items", () => {
    const order = service.createOrder({ items: [{ productId: "product-1", quantity: 1 }] });

    expect(order.items).toHaveLength(1);
  });
});
```

## 8. Use afterEach To Clear External Resources

Use `afterEach` to clean up timers, mocks, database connections, files, network servers, and other resources that can affect later tests.

Good:

```ts
afterEach(async () => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  await database.close();
});
```
