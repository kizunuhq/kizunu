import { metaCredentialsSchema } from '@kizunu/api-contracts/channel'
import { MetaWhatsappPlugin } from '@kizunu/api/modules/channel/plugins/meta-whatsapp/meta-whatsapp.plugin'
import { describe, expect, it } from 'vite-plus/test'

// Drift guard: the credential descriptor is a hand-authored projection of the
// configSchema's cloud_api branch (the form path), so a unit test must fail the
// moment the two diverge. The coexistence branch is constructed by the connect
// endpoint server-side; it has no operator descriptor.
const { credentialFields } = new MetaWhatsappPlugin().manifest
const descriptorKeys = credentialFields.map((field) => field.key)
const [cloudApiBranch] = metaCredentialsSchema.options
const cloudApiKeys = Object.keys(cloudApiBranch.shape).filter((key) => key !== 'channelMode')

const validCloudApiCredentials = {
  appId: 'app-1',
  appSecret: 'app-secret-1',
  wabaId: 'waba-1',
  phoneNumberId: 'phone-1',
  systemToken: 'token-1',
  verifyToken: 'verify-token-1',
}

describe('Meta credential descriptor', () => {
  it('declares exactly the keys the cloud_api branch accepts (less the channelMode discriminator)', () => {
    expect([...descriptorKeys].sort()).toEqual([...cloudApiKeys].sort())
  })

  for (const field of credentialFields.filter((entry) => entry.required)) {
    it(`rejects cloud_api credentials missing the required field ${field.key}`, () => {
      const withoutField = Object.fromEntries(
        Object.entries(validCloudApiCredentials).filter(([key]) => key !== field.key),
      )

      expect(
        metaCredentialsSchema.safeParse({ ...withoutField, channelMode: 'cloud_api' }).success,
      ).toBe(false)
    })
  }
})
