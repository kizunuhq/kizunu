// Setup for the Vitest `unit` project. The unit worker is Node, so production
// code that reaches for the `Bun` global (e.g. `Bun.randomUUIDv7()` for ids)
// would crash. Polyfill the surface with the same node equivalents the
// integration + e2e projects use.
import { installBunPolyfill } from '@kizunu/api/__test__/bun-polyfill'

installBunPolyfill()
