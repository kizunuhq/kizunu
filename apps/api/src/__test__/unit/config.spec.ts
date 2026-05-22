import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test'

import { load } from '../../api.config'

const ENV_KEYS = ['NODE_ENV', 'PORT', 'APP_DATABASE_URL', 'APP_SESSION_TTL_DAYS'] as const
const VALID_DB_URL = 'postgresql://user:pass@localhost:5432/kizunu_dev'

describe('load (api config)', () => {
  let snapshot: Record<string, string | undefined>

  beforeEach(() => {
    snapshot = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]))
  })

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (snapshot[key] === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = snapshot[key]
      }
    }
  })

  it('applies development defaults when the environment is unset', () => {
    // Arrange
    delete process.env.NODE_ENV
    delete process.env.PORT
    process.env.APP_DATABASE_URL = VALID_DB_URL

    // Act
    const config = load()

    // Assert
    expect(config.env).toBe('development')
    expect(config.port).toBe(3001)
    expect(config.session.ttlDays).toBe(30)
  })

  it('coerces PORT from string to number', () => {
    // Arrange
    process.env.APP_DATABASE_URL = VALID_DB_URL
    process.env.PORT = '4000'

    // Act + Assert
    expect(load().port).toBe(4000)
  })

  it('throws when the database url is missing', () => {
    // Arrange
    delete process.env.APP_DATABASE_URL

    // Act + Assert
    expect(() => load()).toThrow(/Invalid configuration/)
  })
})
