import { credentialFieldRegistry } from '@kizunu/api-contracts/shared'
import { CrmConnectorRegistry } from '@kizunu/api/modules/crm/core/connector/crm-connector-registry'
import { defineCrmConnector } from '@kizunu/api/modules/crm/core/connector/define-crm-connector'
import {
  DuplicateCrmConnectorException,
  InvalidConnectorCredentialsException,
  UnknownCrmConnectorException,
} from '@kizunu/api/modules/crm/core/errors/crm.errors'
import { buildPipedriveConnector } from '@kizunu/api/modules/crm/plugins/pipedrive/pipedrive.connector'
import { describe, expect, it } from 'vite-plus/test'
import { z } from 'zod'

const validCredentials = { apiToken: 'token-1', companyDomain: 'acme' }

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
    region: storageSchema.shape.region.optional(),
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

type InputCredentials = z.infer<typeof inputSchema>
type StorageCredentials = z.infer<typeof storageSchema>

function buildFakeConnector(
  options: {
    prepareCredentials?: (input: { credentials: InputCredentials }) => Promise<StorageCredentials>
  } = {},
) {
  return defineCrmConnector<typeof storageSchema, typeof inputSchema>({
    manifest: {
      id: 'fake',
      name: 'Fake',
      capabilities: [],
      configSchema: storageSchema,
      inputSchema,
    },
    ...baseSpec,
    ...(options.prepareCredentials ? { prepareCredentials: options.prepareCredentials } : {}),
  })
}

describe('CrmConnectorRegistry', () => {
  it('resolves a registered connector by id', () => {
    const connector = buildPipedriveConnector()
    const registry = new CrmConnectorRegistry([connector])

    expect(registry.get('pipedrive')).toBe(connector)
    expect(registry.has('pipedrive')).toBe(true)
  })

  it('rejects an unknown connector id', () => {
    const registry = new CrmConnectorRegistry([buildPipedriveConnector()])

    expect(() => registry.get('hubspot')).toThrow(UnknownCrmConnectorException)
  })

  it('fails fast when two connectors register the same id', () => {
    expect(
      () => new CrmConnectorRegistry([buildPipedriveConnector(), buildPipedriveConnector()]),
    ).toThrow(DuplicateCrmConnectorException)
  })

  it('validates credentials against the connector schema and applies defaults', () => {
    const registry = new CrmConnectorRegistry([buildPipedriveConnector()])

    expect(registry.validateCredentials('pipedrive', validCredentials)).toMatchObject({
      apiToken: 'token-1',
      companyDomain: 'acme',
      activityType: 'task',
    })
  })

  it('rejects credentials that violate the connector schema', () => {
    const registry = new CrmConnectorRegistry([buildPipedriveConnector()])

    expect(() => registry.validateCredentials('pipedrive', { companyDomain: 'acme' })).toThrow(
      InvalidConnectorCredentialsException,
    )
  })

  describe('prepareCredentials', () => {
    it('passes through when the connector omits the hook', async () => {
      const registry = new CrmConnectorRegistry([buildFakeConnector()])

      const result = await registry.prepareCredentials('fake', {
        apiToken: 't',
        region: 'us-east',
      })

      expect(result).toEqual({ apiToken: 't', region: 'us-east' })
    })

    it('rejects input that violates inputSchema', async () => {
      const registry = new CrmConnectorRegistry([buildFakeConnector()])

      await expect(registry.prepareCredentials('fake', { region: 'us-east' })).rejects.toThrow(
        InvalidConnectorCredentialsException,
      )
    })

    it('invokes the hook with input-parsed credentials and returns its result', async () => {
      const registry = new CrmConnectorRegistry([
        buildFakeConnector({
          prepareCredentials: async ({ credentials }) => ({
            apiToken: credentials.apiToken,
            region: credentials.region ?? 'derived-region',
          }),
        }),
      ])

      const result = await registry.prepareCredentials('fake', { apiToken: 't' })

      expect(result).toEqual({ apiToken: 't', region: 'derived-region' })
    })

    it('rejects a hook return that does not match configSchema', async () => {
      const registry = new CrmConnectorRegistry([
        buildFakeConnector({
          prepareCredentials: async () => ({ apiToken: 't' }) as unknown as StorageCredentials,
        }),
      ])

      await expect(registry.prepareCredentials('fake', { apiToken: 't' })).rejects.toThrow(
        InvalidConnectorCredentialsException,
      )
    })

    it('bubbles a hook-thrown exception unchanged', async () => {
      class DomainSpecific extends Error {
        constructor() {
          super('boom')
        }
      }
      const registry = new CrmConnectorRegistry([
        buildFakeConnector({
          prepareCredentials: async () => {
            throw new DomainSpecific()
          },
        }),
      ])

      await expect(registry.prepareCredentials('fake', { apiToken: 't' })).rejects.toBeInstanceOf(
        DomainSpecific,
      )
    })
  })
})
