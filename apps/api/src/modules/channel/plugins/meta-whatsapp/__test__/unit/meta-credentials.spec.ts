import { metaCredentialsSchema } from '@kizunu/api/modules/channel/plugins/meta-whatsapp/meta-credentials'
import { describe, expect, it } from 'vite-plus/test'

const validCredentials = {
  appId: 'app-1',
  appSecret: 'app-secret-1',
  wabaId: 'waba-1',
  phoneNumberId: 'phone-1',
  systemToken: 'token-1',
  verifyToken: 'verify-token-1',
}

describe('metaCredentialsSchema', () => {
  it('accepts a full Meta credential set', () => {
    expect(metaCredentialsSchema.safeParse(validCredentials).success).toBe(true)
  })

  for (const requiredKey of Object.keys(validCredentials)) {
    it(`rejects credentials missing ${requiredKey}`, () => {
      const without = Object.fromEntries(
        Object.entries(validCredentials).filter(([key]) => key !== requiredKey),
      )

      expect(metaCredentialsSchema.safeParse(without).success).toBe(false)
    })
  }

  it('rejects unknown credential keys', () => {
    expect(metaCredentialsSchema.safeParse({ ...validCredentials, extra: 'nope' }).success).toBe(
      false,
    )
  })
})
