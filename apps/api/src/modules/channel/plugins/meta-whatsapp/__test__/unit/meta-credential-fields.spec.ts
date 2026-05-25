import { metaCredentialsSchema } from '@kizunu/api-contracts/channel'
import { buildMetaWhatsappPlugin } from '@kizunu/api/modules/channel/plugins/meta-whatsapp/meta-whatsapp.plugin'
import { describe, expect, it } from 'vite-plus/test'

// Drift guard: the credential descriptor is derived from the manifest's
// inputSchema (the cloud_api operator form), so the keys must exactly match
// the cloud_api branch of the stored schema (less the discriminator). When
// the schema changes, the descriptor changes; this test fails if anyone
// hand-overrides the descriptor instead of updating the schema.
const { credentialFields } = buildMetaWhatsappPlugin().manifest

if (credentialFields.kind !== 'flat') {
  throw new Error('expected flat credentialFields derived from the cloud_api inputSchema')
}

const descriptorKeys = credentialFields.fields.map((field) => field.key)
const [cloudApiBranch] = metaCredentialsSchema.options
const cloudApiKeys = Object.keys(cloudApiBranch.shape).filter(
  (key) => key !== 'channelMode' && key !== 'verifyToken',
)

const validCloudApiCredentials = {
  appId: 'app-1',
  appSecret: 'app-secret-1',
  wabaId: 'waba-1',
  phoneNumberId: 'phone-1',
  systemToken: 'token-1',
}

describe('Meta credential descriptor', () => {
  it('declares exactly the keys the cloud_api inputSchema accepts', () => {
    expect([...descriptorKeys].sort()).toEqual([...cloudApiKeys].sort())
  })

  for (const field of credentialFields.fields.filter((entry) => entry.required)) {
    it(`rejects cloud_api credentials missing the required field ${field.key}`, () => {
      const withoutField = Object.fromEntries(
        Object.entries(validCloudApiCredentials).filter(([key]) => key !== field.key),
      )

      expect(
        metaCredentialsSchema.safeParse({
          ...withoutField,
          channelMode: 'cloud_api',
          verifyToken: 'verify-token-1',
        }).success,
      ).toBe(false)
    })
  }
})
