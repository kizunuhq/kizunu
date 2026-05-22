import { Inject, Injectable } from '@nestjs/common'

import {
  DuplicateCrmConnectorException,
  InvalidConnectorCredentialsException,
  UnknownCrmConnectorException,
} from '../errors/crm.errors'
import type { CRMConnector } from './crm-connector'
import type { CrmConnectorManifest } from './crm-connector-manifest'

/** DI token for the array of CRM connectors wired into the module. */
export const CRM_CONNECTORS = Symbol('CRM_CONNECTORS')

/**
 * Resolves CRM connectors by id and validates ConnectorAccount credentials against a
 * connector's `configSchema`. Connectors are injected as a multi-provider array and
 * indexed at construction; a duplicate id is a wiring error and fails fast.
 */
@Injectable()
export class CrmConnectorRegistry {
  private readonly connectors = new Map<string, CRMConnector>()

  constructor(@Inject(CRM_CONNECTORS) connectors: CRMConnector[]) {
    for (const connector of connectors) {
      if (this.connectors.has(connector.manifest.id)) {
        throw new DuplicateCrmConnectorException(connector.manifest.id)
      }
      this.connectors.set(connector.manifest.id, connector)
    }
  }

  has(id: string): boolean {
    return this.connectors.has(id)
  }

  get(id: string): CRMConnector {
    const connector = this.connectors.get(id)
    if (!connector) throw new UnknownCrmConnectorException(id)
    return connector
  }

  listManifests(): CrmConnectorManifest[] {
    return [...this.connectors.values()].map((connector) => connector.manifest)
  }

  validateCredentials(id: string, credentials: unknown): unknown {
    const connector = this.get(id)
    const result = connector.manifest.configSchema.safeParse(credentials)
    if (!result.success) throw new InvalidConnectorCredentialsException(id)
    return result.data
  }
}
