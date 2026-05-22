// Setup for the Vitest `e2e` project. The NestJS app is booted in-process via
// the testing module (no socket opened), so we only pin environment defaults
// here and point the app at the isolated test database.
process.env['NODE_ENV'] ??= 'test'
process.env['APP_DATABASE_URL'] ??= 'postgresql://postgres:postgres@localhost:5432/kizunu_test'

// The booted app inserts rows via Drizzle, whose id default calls
// `Bun.randomUUIDv7()`; the Node test worker has no `Bun` global, so polyfill it.
if (typeof (globalThis as { Bun?: unknown }).Bun === 'undefined') {
  ;(globalThis as { Bun?: { randomUUIDv7: () => string } }).Bun = {
    randomUUIDv7: () => crypto.randomUUID(),
  }
}
