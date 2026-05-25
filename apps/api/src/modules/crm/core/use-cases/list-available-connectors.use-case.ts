import type { CredentialField } from '@kizunu/api-contracts/shared'
import { Injectable } from '@nestjs/common'

import { CrmConnectorRegistry } from '../connector/crm-connector-registry'

export interface AvailableConnector {
  id: string
  name: string
  capabilities: string[]
  credentialFields: CredentialField[]
}

/**
 * Lists connector manifests for `GET /connectors`. Mirrors the channel
 * module's `GET /channel-plugins`. The wire response is a flat array of
 * operator-input fields per connector — `defineCrmConnector` enforces that
 * `configSchema` produces a flat `CredentialFields`, so a discriminated
 * value here is a wiring bug.
 */
@Injectable()
export class ListAvailableConnectorsUseCase {
  constructor(private readonly registry: CrmConnectorRegistry) {}

  execute(): AvailableConnector[] {
    return this.registry.listManifests().map((manifest) => {
      if (manifest.credentialFields.kind !== 'flat') {
        throw new Error(
          `CRM connector "${manifest.id}" has a discriminated credentialFields shape; flat is required.`,
        )
      }
      return {
        id: manifest.id,
        name: manifest.name,
        capabilities: manifest.capabilities,
        credentialFields: manifest.credentialFields.fields,
      }
    })
  }
}
