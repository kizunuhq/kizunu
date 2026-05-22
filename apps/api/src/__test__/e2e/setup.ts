// Setup for the Vitest `e2e` project. The NestJS app is booted in-process via
// the testing module (no socket opened), so we only pin environment defaults
// here and point the app at the isolated test database.
import { installBunPolyfill } from '@kizunu/api/__test__/bun-polyfill'

process.env['NODE_ENV'] ??= 'test'
process.env['APP_DATABASE_URL'] ??= 'postgresql://postgres:postgres@localhost:5432/kizunu_test'

// The booted app reaches for `Bun` APIs (Drizzle id defaults, password hashing)
// that the Node test worker lacks; polyfill them with node equivalents.
installBunPolyfill()
