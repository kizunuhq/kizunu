import type { DirectoryResult } from '@kizunu/api-contracts/shared'
import type { DirectoryInput } from '@kizunu/api/modules/_shared/directory/directory-input'
import { Inject, Injectable } from '@nestjs/common'

import {
  DuplicateCrmConnectorException,
  InvalidConnectorCredentialsException,
  UnknownCrmConnectorException,
} from '../errors/crm.errors'
import type { CrmActivity } from './crm-activity'
import type { CRMConnector } from './crm-connector'
import type { CrmConnectorManifest } from './crm-connector-manifest'
import type { NormalizedEvent } from './normalized-event'
import type { NormalizedLead } from './normalized-lead'
import type { NormalizedOwner } from './normalized-owner'
import type { StageRef } from './stage-ref'

/** DI token for the array of CRM connectors wired into the module. */
export const CRM_CONNECTORS = Symbol('CRM_CONNECTORS')

/**
 * Resolves CRM connectors by id and parses ConnectorAccount credentials at a
 * single seam. Use-cases call the typed-bridge methods instead of reaching
 * for `connector.X` directly; the bridge parses raw credentials against the
 * connector's `configSchema` once and passes the typed value to the
 * connector method.
 *
 * Connectors are injected as a multi-provider array and indexed at
 * construction; a duplicate id is a wiring error and fails fast.
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

  /**
   * Parse the create-time input against `inputSchema ?? configSchema`, run
   * the connector's optional `prepareCredentials` hook, then re-parse the
   * hook's return against `configSchema`. The result is ready to persist on
   * the ConnectorAccount.
   *
   * Hook-thrown exceptions (e.g. PipedriveTokenInvalidException) bubble
   * unchanged so use cases never need to wrap registry calls. Schema
   * failures throw `InvalidConnectorCredentialsException`.
   */
  async prepareCredentials(id: string, rawInput: unknown): Promise<unknown> {
    const connector = this.get(id)
    const inputSchema = connector.manifest.inputSchema ?? connector.manifest.configSchema
    const inputParsed = inputSchema.safeParse(rawInput)
    if (!inputParsed.success) throw new InvalidConnectorCredentialsException(id)
    const enriched = connector.prepareCredentials
      ? await connector.prepareCredentials({ credentials: inputParsed.data })
      : inputParsed.data
    const storageParsed = connector.manifest.configSchema.safeParse(enriched)
    if (!storageParsed.success) throw new InvalidConnectorCredentialsException(id)
    return storageParsed.data
  }

  parseWebhook(id: string, raw: unknown, rawCredentials: unknown): NormalizedEvent[] {
    const connector = this.get(id)
    return connector.parseWebhook(raw, this.parseCredentials(connector, id, rawCredentials))
  }

  async fetchLead(
    id: string,
    externalId: string,
    rawCredentials: unknown,
  ): Promise<NormalizedLead> {
    const connector = this.get(id)
    return connector.fetchLead(externalId, this.parseCredentials(connector, id, rawCredentials))
  }

  async fetchOwner(
    id: string,
    externalId: string,
    rawCredentials: unknown,
  ): Promise<NormalizedOwner | null> {
    const connector = this.get(id)
    if (!connector.fetchOwner) return null
    return connector.fetchOwner(externalId, this.parseCredentials(connector, id, rawCredentials))
  }

  async logActivity(
    id: string,
    externalId: string,
    activity: CrmActivity,
    rawCredentials: unknown,
  ): Promise<{ externalActivityId: string }> {
    const connector = this.get(id)
    return connector.logActivity(
      externalId,
      activity,
      this.parseCredentials(connector, id, rawCredentials),
    )
  }

  async moveStage(
    id: string,
    externalId: string,
    stage: StageRef,
    rawCredentials: unknown,
  ): Promise<void> {
    const connector = this.get(id)
    return connector.moveStage(
      externalId,
      stage,
      this.parseCredentials(connector, id, rawCredentials),
    )
  }

  async markLost(
    id: string,
    externalId: string,
    reason: string,
    rawCredentials: unknown,
  ): Promise<void> {
    const connector = this.get(id)
    return connector.markLost(
      externalId,
      reason,
      this.parseCredentials(connector, id, rawCredentials),
    )
  }

  async setField(
    id: string,
    externalId: string,
    field: string,
    value: unknown,
    rawCredentials: unknown,
  ): Promise<void> {
    const connector = this.get(id)
    return connector.setField(
      externalId,
      field,
      value,
      this.parseCredentials(connector, id, rawCredentials),
    )
  }

  async directory(
    id: string,
    input: Omit<DirectoryInput, 'credentials'>,
    rawCredentials: unknown,
  ): Promise<DirectoryResult> {
    const connector = this.get(id)
    if (!connector.directory) {
      throw new InvalidConnectorCredentialsException(id)
    }
    return connector.directory({
      ...input,
      credentials: this.parseCredentials(connector, id, rawCredentials),
    })
  }

  private parseCredentials(connector: CRMConnector, id: string, raw: unknown): unknown {
    const result = connector.manifest.configSchema.safeParse(raw)
    if (!result.success) throw new InvalidConnectorCredentialsException(id)
    return result.data
  }
}
