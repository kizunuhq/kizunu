import { metaCredentialsClientSchema, metaCredentialsSchema } from '@kizunu/api-contracts/channel'
import { describe, expect, it } from 'vite-plus/test'

const cloudApiCredentials = {
  channelMode: 'cloud_api' as const,
  appId: 'app-1',
  appSecret: 'app-secret-1',
  wabaId: 'waba-1',
  phoneNumberId: 'phone-1',
  systemToken: 'token-1',
  verifyToken: 'verify-token-1',
}

const coexistenceCredentials = {
  channelMode: 'coexistence' as const,
  wabaId: 'waba-1',
  phoneNumberId: 'phone-1',
  verifyToken: 'verify-token-1',
  accessToken: 'biz-token-1',
  refreshToken: 'refresh-1',
  accessTokenExpiresAt: '2026-07-22T00:00:00.000Z',
}

describe('metaCredentialsSchema', () => {
  it('accepts a full cloud_api credential set', () => {
    expect(metaCredentialsSchema.safeParse(cloudApiCredentials).success).toBe(true)
  })

  it('accepts a coexistence credential set with the OAuth triplet', () => {
    expect(metaCredentialsSchema.safeParse(coexistenceCredentials).success).toBe(true)
  })

  it('rejects coexistence credentials missing accessToken', () => {
    const without = { ...coexistenceCredentials } as Partial<typeof coexistenceCredentials>
    delete without.accessToken

    expect(metaCredentialsSchema.safeParse(without).success).toBe(false)
  })

  it('rejects cloud_api credentials missing systemToken', () => {
    const without = { ...cloudApiCredentials } as Partial<typeof cloudApiCredentials>
    delete without.systemToken

    expect(metaCredentialsSchema.safeParse(without).success).toBe(false)
  })

  it('rejects unknown credential keys in each branch', () => {
    expect(metaCredentialsSchema.safeParse({ ...cloudApiCredentials, extra: 'nope' }).success).toBe(
      false,
    )
    expect(
      metaCredentialsSchema.safeParse({ ...coexistenceCredentials, extra: 'nope' }).success,
    ).toBe(false)
  })

  it('rejects credentials with an unknown channelMode', () => {
    expect(
      metaCredentialsSchema.safeParse({ ...cloudApiCredentials, channelMode: 'sms' }).success,
    ).toBe(false)
  })
})

describe('metaCredentialsClientSchema (cloud_api operator input)', () => {
  it('accepts the 5 operator-supplied fields', () => {
    const input = {
      appId: 'app-1',
      appSecret: 'app-secret-1',
      wabaId: 'waba-1',
      phoneNumberId: 'phone-1',
      systemToken: 'token-1',
    }
    expect(metaCredentialsClientSchema.safeParse(input).success).toBe(true)
  })

  it('rejects input that includes verifyToken (server-generated)', () => {
    expect(
      metaCredentialsClientSchema.safeParse({
        appId: 'a',
        appSecret: 's',
        wabaId: 'w',
        phoneNumberId: 'p',
        systemToken: 't',
        verifyToken: 'forged',
      }).success,
    ).toBe(false)
  })
})
