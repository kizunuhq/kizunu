import { CrmConnectorRegistry } from '@kizunu/api/modules/crm/core/connector/crm-connector-registry'
import {
  DuplicateCrmConnectorException,
  InvalidConnectorCredentialsException,
  UnknownCrmConnectorException,
} from '@kizunu/api/modules/crm/core/errors/crm.errors'
import { buildPipedriveConnector } from '@kizunu/api/modules/crm/plugins/pipedrive/pipedrive.connector'
import { describe, expect, it } from 'vite-plus/test'

const validCredentials = { apiToken: 'token-1', companyDomain: 'acme' }

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
})
