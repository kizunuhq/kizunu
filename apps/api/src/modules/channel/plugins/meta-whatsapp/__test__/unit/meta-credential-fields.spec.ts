import { metaCredentialsSchema } from '@kizunu/api/modules/channel/plugins/meta-whatsapp/meta-credentials'
import { MetaWhatsappPlugin } from '@kizunu/api/modules/channel/plugins/meta-whatsapp/meta-whatsapp.plugin'
import { describe, expect, it } from 'vite-plus/test'

// Drift guard: the credential descriptor is a hand-authored projection of the
// configSchema, so a unit test must fail the moment the two diverge.
const { credentialFields } = new MetaWhatsappPlugin().manifest
const descriptorKeys = credentialFields.map((field) => field.key)
const schemaKeys = Object.keys(metaCredentialsSchema.shape)

const validCredentials = { wabaId: 'waba-1', phoneNumberId: 'phone-1', systemToken: 'token-1' }

describe('Meta credential descriptor', () => {
  it('declares exactly the keys its configSchema accepts', () => {
    expect([...descriptorKeys].sort()).toEqual([...schemaKeys].sort())
  })

  for (const field of credentialFields.filter((entry) => entry.required)) {
    it(`rejects credentials missing the required field ${field.key}`, () => {
      const withoutField = Object.fromEntries(
        Object.entries(validCredentials).filter(([key]) => key !== field.key),
      )

      expect(metaCredentialsSchema.safeParse(withoutField).success).toBe(false)
    })
  }
})
