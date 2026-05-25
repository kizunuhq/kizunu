import { describe, expect, it } from 'vite-plus/test'

import { metaCoexistenceCredentialsSchema } from '../../meta-credentials.contract'

const validCredentials = {
  channelMode: 'coexistence' as const,
  wabaId: 'waba-123',
  phoneNumberId: 'phone-456',
  verifyToken: 'verify-abc',
  accessToken: 'access-xyz',
}

describe('metaCoexistenceCredentialsSchema', () => {
  it('parses a valid coexistence credentials object', () => {
    const result = metaCoexistenceCredentialsSchema.safeParse(validCredentials)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.channelMode).toBe('coexistence')
      expect(result.data.wabaId).toBe('waba-123')
    }
  })

  it('parses with optional oauth fields present', () => {
    const withOptionals = {
      ...validCredentials,
      refreshToken: 'refresh-token',
      accessTokenExpiresAt: '2026-01-01T00:00:00.000Z',
    }

    const result = metaCoexistenceCredentialsSchema.safeParse(withOptionals)

    expect(result.success).toBe(true)
  })

  it('rejects when a required field is missing', () => {
    const { accessToken: _, ...missing } = validCredentials

    const result = metaCoexistenceCredentialsSchema.safeParse(missing)

    expect(result.success).toBe(false)
  })

  it('rejects when channelMode is the wrong discriminator', () => {
    const wrong = { ...validCredentials, channelMode: 'cloud_api' }

    const result = metaCoexistenceCredentialsSchema.safeParse(wrong)

    expect(result.success).toBe(false)
  })
})
