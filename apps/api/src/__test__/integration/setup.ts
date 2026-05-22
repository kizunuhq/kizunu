// Setup for the Vitest `integration` project. Runs before each test file.
// Points environment defaults at the isolated test database.
process.env['NODE_ENV'] ??= 'test'
process.env['TEST_DATABASE_URL'] ??= 'postgresql://postgres:postgres@localhost:5432/kizunu_test'

// Vitest runs these specs in a Node worker that has no `Bun` global, but the
// Drizzle schema id default (`defaults()`) calls `Bun.randomUUIDv7()` at insert
// time. Polyfill it with the standard crypto UUID so DB-backed inserts work.
if (typeof (globalThis as { Bun?: unknown }).Bun === 'undefined') {
  ;(globalThis as { Bun?: { randomUUIDv7: () => string } }).Bun = {
    randomUUIDv7: () => crypto.randomUUID(),
  }
}
