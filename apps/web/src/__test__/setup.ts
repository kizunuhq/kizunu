import * as matchers from '@testing-library/jest-dom/matchers'
import { cleanup } from '@testing-library/react'
import { afterEach, expect } from 'vite-plus/test'

// Wire jest-dom matchers into vite-plus/test's expect and unmount rendered
// trees after every test so the jsdom document stays isolated.
expect.extend(matchers)

afterEach(() => {
  cleanup()
})
