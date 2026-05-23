// Setup for the Vitest `integration` project. Runs before each test file.
// Points environment defaults at the isolated test database.
import { installBunPolyfill } from '@kizunu/api/__test__/bun-polyfill'

process.env['NODE_ENV'] ??= 'test'
process.env['TEST_DATABASE_URL'] ??= 'postgresql://postgres:postgres@localhost:5432/kizunu_test'
// 32-byte base64 key — required by EncryptedCredentialsService at boot.
process.env['APP_CREDENTIALS_ENCRYPTION_KEY'] ??= 'htYxDTrLXwIJ1iCWH6q6je/JXJlVkqLL64Fd9EOml+4='

// The Node test worker has no `Bun` global, but DB-backed inserts call the
// Drizzle id default `Bun.randomUUIDv7()`; polyfill it (and the rest of the
// Bun surface the app uses) with node equivalents.
installBunPolyfill()
