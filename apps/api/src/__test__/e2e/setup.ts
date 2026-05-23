// Setup for the Vitest `e2e` project. The NestJS app is booted in-process via
// the testing module (no socket opened), so we only pin environment defaults
// here and point the app at the isolated test database.
import { installBunPolyfill } from '@kizunu/api/__test__/bun-polyfill'

process.env['NODE_ENV'] ??= 'test'
process.env['APP_DATABASE_URL'] ??= 'postgresql://postgres:postgres@localhost:5432/kizunu_test'
// 32-byte base64 key — required by EncryptedCredentialsService at boot.
process.env['APP_CREDENTIALS_ENCRYPTION_KEY'] ??= 'htYxDTrLXwIJ1iCWH6q6je/JXJlVkqLL64Fd9EOml+4='
// Meta Coex env vars — only the connect endpoint exercises them.
process.env['META_APP_ID'] ??= 'fixture-app'
process.env['META_APP_SECRET'] ??= 'fixture-secret'
process.env['META_COEX_CONFIG_ID'] ??= 'fixture-config'

// The booted app reaches for `Bun` APIs (Drizzle id defaults, password hashing)
// that the Node test worker lacks; polyfill them with node equivalents.
installBunPolyfill()
