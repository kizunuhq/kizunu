import type { ChannelCredentialField } from '@kizunu/api-contracts/channel'
import { hasRequiredCredentials } from '@kizunu/web/routes/_app/settings/channels/-utils/has-required-credentials'
import { describe, expect, it } from 'vite-plus/test'

const required = (key: string): ChannelCredentialField => ({
  key,
  label: key,
  type: 'text',
  required: true,
})
const optional = (key: string): ChannelCredentialField => ({
  key,
  label: key,
  type: 'text',
  required: false,
})

describe('hasRequiredCredentials', () => {
  it('is satisfied when there are no fields', () => {
    expect(hasRequiredCredentials([], {})).toBe(true)
  })

  it('is satisfied when every required field has a value', () => {
    expect(hasRequiredCredentials([required('wabaId')], { wabaId: '123' })).toBe(true)
  })

  it('is not satisfied when a required field is missing', () => {
    expect(hasRequiredCredentials([required('wabaId')], {})).toBe(false)
  })

  it('is not satisfied when a required field is blank', () => {
    expect(hasRequiredCredentials([required('wabaId')], { wabaId: '' })).toBe(false)
  })

  it('treats a whitespace-only value as blank', () => {
    expect(hasRequiredCredentials([required('wabaId')], { wabaId: '   ' })).toBe(false)
  })

  it('ignores blank optional fields', () => {
    expect(hasRequiredCredentials([optional('note')], { note: '' })).toBe(true)
  })
})
