import { credentialFieldRegistry } from '@kizunu/api-contracts/shared'
import { defineCrmConnector } from '@kizunu/api/modules/crm/core/connector/define-crm-connector'
import { describe, expect, it } from 'vite-plus/test'
import { z } from 'zod'

const storageSchema = z
  .object({
    apiToken: z
      .string()
      .min(1)
      .register(credentialFieldRegistry, { label: 'API token', type: 'secret' }),
    region: z.string().min(1).register(credentialFieldRegistry, { label: 'Region', type: 'text' }),
  })
  .strict()

const inputSchema = z
  .object({
    apiToken: storageSchema.shape.apiToken,
    region: z
      .string()
      .min(1)
      .register(credentialFieldRegistry, { label: 'Region', type: 'text' })
      .optional(),
  })
  .strict()

const baseSpec = {
  parseWebhook: () => [],
  fetchLead: async () => ({
    externalId: 'x',
    ownerExternalId: null,
    name: '',
    raw: {},
  }),
  logActivity: async () => ({ externalActivityId: 'a' }),
  moveStage: async () => undefined,
  markLost: async () => undefined,
  setField: async () => undefined,
} as const

describe('defineCrmConnector', () => {
  it('derives credentialFields from configSchema when inputSchema is absent', () => {
    const connector = defineCrmConnector({
      manifest: {
        id: 'fake',
        name: 'Fake',
        capabilities: [],
        configSchema: storageSchema,
      },
      ...baseSpec,
    })

    expect(connector.manifest.credentialFields).toEqual({
      kind: 'flat',
      fields: [
        { key: 'apiToken', label: 'API token', type: 'secret', required: true },
        { key: 'region', label: 'Region', type: 'text', required: true },
      ],
    })
  })

  it('derives credentialFields from inputSchema when provided', () => {
    const connector = defineCrmConnector({
      manifest: {
        id: 'fake',
        name: 'Fake',
        capabilities: [],
        configSchema: storageSchema,
        inputSchema,
      },
      ...baseSpec,
    })

    expect(connector.manifest.credentialFields).toEqual({
      kind: 'flat',
      fields: [
        { key: 'apiToken', label: 'API token', type: 'secret', required: true },
        { key: 'region', label: 'Region', type: 'text', required: false },
      ],
    })
  })
})
