import { describe, expect, it } from 'vite-plus/test'
import { z } from 'zod'

import { credentialFieldRegistry, describeCredentialFields } from '../../describe-credential-fields'

// Feature 057 readiness — the walker must already handle a flat Pipedrive-
// shaped schema (required + optional + default + serverGenerated) so the
// connectors adoption is a pure consumer change, not a revisit of the
// shared layer. The fixture mirrors today's pipedriveCredentialsSchema and
// adds .register() annotations the way 057 will when it moves the schema
// into @kizunu/api-contracts/crm.
const pipedriveFixtureSchema = z
  .object({
    apiToken: z
      .string()
      .min(1)
      .register(credentialFieldRegistry, { label: 'API token', type: 'secret' }),
    companyDomain: z
      .string()
      .min(1)
      .register(credentialFieldRegistry, { label: 'Company domain', type: 'text' }),
    activityType: z
      .string()
      .min(1)
      .register(credentialFieldRegistry, { label: 'Activity type', type: 'text' })
      .default('task'),
    phoneFieldKey: z
      .string()
      .min(1)
      .register(credentialFieldRegistry, { label: 'Phone field key', type: 'text' })
      .optional(),
    webhookToken: z
      .string()
      .min(1)
      .register(credentialFieldRegistry, {
        label: 'Webhook token',
        type: 'secret',
        serverGenerated: true,
      })
      .optional(),
  })
  .strict()

describe('describeCredentialFields (Pipedrive-shaped fixture)', () => {
  it('emits a flat CredentialFields with required + optional + default + serverGenerated entries', () => {
    const result = describeCredentialFields(pipedriveFixtureSchema)

    expect(result).toEqual({
      kind: 'flat',
      fields: [
        { key: 'apiToken', label: 'API token', type: 'secret', required: true },
        { key: 'companyDomain', label: 'Company domain', type: 'text', required: true },
        { key: 'activityType', label: 'Activity type', type: 'text', required: false },
        { key: 'phoneFieldKey', label: 'Phone field key', type: 'text', required: false },
        {
          key: 'webhookToken',
          label: 'Webhook token',
          type: 'secret',
          required: false,
          serverGenerated: true,
        },
      ],
    })
  })
})
