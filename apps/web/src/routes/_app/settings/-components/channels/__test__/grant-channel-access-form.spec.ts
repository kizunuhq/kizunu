import { grantChannelAccessFormSchema } from '@kizunu/web/routes/_app/settings/-components/channels/grant-channel-access-form'
import { describe, expect, it } from 'vite-plus/test'

const aUuid = '11111111-1111-4111-8111-111111111111'
const bUuid = '22222222-2222-4222-8222-222222222222'

describe('grantChannelAccessFormSchema', () => {
  it('accepts a valid accountId + userId pair', () => {
    const result = grantChannelAccessFormSchema.safeParse({ accountId: aUuid, userId: bUuid })

    expect(result.success).toBe(true)
  })

  it('rejects a missing accountId with a field-level error', () => {
    const result = grantChannelAccessFormSchema.safeParse({ accountId: '', userId: bUuid })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === 'accountId')).toBe(true)
    }
  })

  it('rejects a missing userId with a field-level error', () => {
    const result = grantChannelAccessFormSchema.safeParse({ accountId: aUuid, userId: '' })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === 'userId')).toBe(true)
    }
  })
})
