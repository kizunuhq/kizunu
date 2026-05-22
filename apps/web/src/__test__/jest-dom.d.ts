import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers'

// vite-plus/test's `Assertion` extends `JestAssertion`, which extends the
// global `jest.Matchers` interface. Augmenting that interface teaches the type
// checker about the jest-dom matchers wired into `expect` at setup.ts.
declare global {
  namespace jest {
    interface Matchers<R = void> extends TestingLibraryMatchers<unknown, R> {}
  }
}
