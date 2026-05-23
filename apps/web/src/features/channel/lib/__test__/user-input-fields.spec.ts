import type { ChannelCredentialField } from '@kizunu/api-contracts/channel'
import { userInputFields } from '@kizunu/web/features/channel/lib/user-input-fields'
import { describe, expect, it } from 'vite-plus/test'

const userField: ChannelCredentialField = {
  key: 'appId',
  label: 'Meta App ID',
  type: 'text',
  required: true,
}
const serverField: ChannelCredentialField = {
  key: 'verifyToken',
  label: 'Verify token',
  type: 'secret',
  required: true,
  serverGenerated: true,
}

describe('userInputFields', () => {
  it('returns user-supplied fields unchanged when no server-generated field is present', () => {
    expect(userInputFields([userField])).toEqual([userField])
  })

  it('omits serverGenerated entries so the form does not render them', () => {
    expect(userInputFields([userField, serverField])).toEqual([userField])
  })

  it('treats `serverGenerated: false` as a user input', () => {
    const explicitlyUser: ChannelCredentialField = { ...userField, serverGenerated: false }
    expect(userInputFields([explicitlyUser])).toEqual([explicitlyUser])
  })
})
