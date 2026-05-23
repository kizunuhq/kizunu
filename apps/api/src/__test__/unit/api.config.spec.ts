import { load } from '@kizunu/api/api.config'
import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test'

describe('config registration gate', () => {
  const original = process.env.DISABLE_USER_REGISTRATION
  const originalDbUrl = process.env.APP_DATABASE_URL

  beforeEach(() => {
    delete process.env.DISABLE_USER_REGISTRATION
    process.env.APP_DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/kizunu_test'
  })

  afterEach(() => {
    if (original === undefined) delete process.env.DISABLE_USER_REGISTRATION
    else process.env.DISABLE_USER_REGISTRATION = original
    if (originalDbUrl === undefined) delete process.env.APP_DATABASE_URL
    else process.env.APP_DATABASE_URL = originalDbUrl
  })

  it('defaults to open registration when the var is unset', () => {
    expect(load().auth.registrationDisabled).toBe(false)
  })

  it('keeps registration open when the var is the string "false"', () => {
    process.env.DISABLE_USER_REGISTRATION = 'false'

    expect(load().auth.registrationDisabled).toBe(false)
  })

  it('closes registration when the var is the string "true"', () => {
    process.env.DISABLE_USER_REGISTRATION = 'true'

    expect(load().auth.registrationDisabled).toBe(true)
  })
})
