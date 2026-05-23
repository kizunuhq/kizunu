// Setup for the Vitest `unit` project. The unit worker is Node, so production
// code that reaches for the `Bun` global (e.g. `Bun.randomUUIDv7()` for ids)
// would crash. Polyfill the surface with the same node equivalents the
// integration + e2e projects use.
import { installBunPolyfill } from '@kizunu/api/__test__/bun-polyfill'

// 32-byte base64 key — required by EncryptedCredentialsService at boot for
// any unit spec that constructs the persistence layer. Unit specs that load
// config directly (e.g. `__test__/unit/config.spec.ts`) also rely on it.
process.env['APP_CREDENTIALS_ENCRYPTION_KEY'] ??= 'htYxDTrLXwIJ1iCWH6q6je/JXJlVkqLL64Fd9EOml+4='

installBunPolyfill()
