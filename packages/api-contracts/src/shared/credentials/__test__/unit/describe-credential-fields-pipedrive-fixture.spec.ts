import { describe, expect, it } from 'vite-plus/test'
import { z } from 'zod'

import { CredentialFieldType } from '../../credential-field-type'
import { describeCredentialFields } from '../../describe-credential-fields'

// Feature 057 readiness — the walker must already handle a flat Pipedrive-
// shaped schema (required + optional + default + serverGenerated) so the
// connectors adoption is a pure consumer change, not a revisit of the
// shared layer. The fixture mirrors today's pipedriveCredentialsSchema and
// adds .meta() annotations the way 057 will when it moves the schema into
// @kizunu/api-contracts/crm.
const pipedriveFixtureSchema = z
  .object({
    apiToken: z.string().min(1).meta({ label: 'API token', type: 'secret' }),
    companyDomain: z.string().min(1).meta({ label: 'Company domain', type: 'text' }),
    activityType: z.string().min(1).default('task').meta({ label: 'Activity type', type: 'text' }),
    phoneFieldKey: z.string().min(1).optional().meta({ label: 'Phone field key', type: 'text' }),
    webhookToken: z
      .string()
      .min(1)
      .optional()
      .meta({ label: 'Webhook token', type: 'secret', serverGenerated: true }),
  })
  .strict()

describe('describeCredentialFields (Pipedrive-shaped fixture)', () => {
  it('emits a flat CredentialFields with required + optional + default + serverGenerated entries', () => {
    const result = describeCredentialFields(pipedriveFixtureSchema)

    expect(result).toEqual({
      kind: 'flat',
      fields: [
        { key: 'apiToken', label: 'API token', type: CredentialFieldType.Secret, required: true },
        {
          key: 'companyDomain',
          label: 'Company domain',
          type: CredentialFieldType.Text,
          required: true,
        },
        {
          key: 'activityType',
          label: 'Activity type',
          type: CredentialFieldType.Text,
          required: false,
        },
        {
          key: 'phoneFieldKey',
          label: 'Phone field key',
          type: CredentialFieldType.Text,
          required: false,
        },
        {
          key: 'webhookToken',
          label: 'Webhook token',
          type: CredentialFieldType.Secret,
          required: false,
          serverGenerated: true,
        },
      ],
    })
  })
})
