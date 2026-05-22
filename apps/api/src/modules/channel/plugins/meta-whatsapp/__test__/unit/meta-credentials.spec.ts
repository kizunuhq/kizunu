import { metaCredentialsSchema } from '@kizunu/api/modules/channel/plugins/meta-whatsapp/meta-credentials'
import { describe, expect, it } from 'vite-plus/test'

describe('metaCredentialsSchema', () => {
  it('accepts a full Meta credential set', () => {
    const result = metaCredentialsSchema.safeParse({
      wabaId: 'waba-1',
      phoneNumberId: 'phone-1',
      systemToken: 'token-1',
    })

    expect(result.success).toBe(true)
  })

  it('rejects credentials missing the system token', () => {
    const result = metaCredentialsSchema.safeParse({ wabaId: 'waba-1', phoneNumberId: 'phone-1' })

    expect(result.success).toBe(false)
  })

  it('rejects unknown credential keys', () => {
    const result = metaCredentialsSchema.safeParse({
      wabaId: 'waba-1',
      phoneNumberId: 'phone-1',
      systemToken: 'token-1',
      extra: 'nope',
    })

    expect(result.success).toBe(false)
  })
})
