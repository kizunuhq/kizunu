import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers'

// The runner is vite-plus/test (a vitest fork), not jest. jest-dom is only the
// DOM matcher library; it is wired into vite-plus/test's `expect` at runtime in
// setup.ts via `expect.extend`. For the types: the fork's `Assertion` extends
// `JestAssertion`, which extends the global `jest.Matchers` compat namespace,
// so augmenting that interface is what surfaces the matchers to the checker.
// The idiomatic `@testing-library/jest-dom/vitest` entry does not apply here —
// it augments `declare module 'vitest'`, but `vitest` is not a dependency and
// the fork re-exports `Assertion` from `@voidzero-dev/vite-plus-test`.
// Signature mirrors jest-dom's own jest.d.ts augmentation.
declare global {
  namespace jest {
    interface Matchers<R = void, T = {}> extends TestingLibraryMatchers<unknown, R> {}
  }
}
