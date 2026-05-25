import type { ConnectorHealth, ConnectorHealthCheck } from '@kizunu/api-contracts/crm'
import { ConnectorHealthCheckStatus, ConnectorHealthOverall } from '@kizunu/api-contracts/crm'
import { ChannelAccessRepository } from '@kizunu/api/modules/channel/persistence/channel-access.repository'
import { Injectable } from '@nestjs/common'

import { ConnectorAccountRepository } from '../../persistence/connector-account.repository'
import { CrmConnectorRegistry } from '../connector/crm-connector-registry'
import { ConnectorAccountNotFoundException } from '../errors/crm.errors'
import { ResolveOwnerService } from '../services/resolve-owner.service'

const META_PLUGIN_IDS: ReadonlySet<string> = new Set(['meta-whatsapp', 'meta-whatsapp-coex'])

export interface DryRunDealInput {
  workspaceId: string
  connectorAccountId: string
  externalDealId: string
}

@Injectable()
export class DryRunDealUseCase {
  constructor(
    private readonly accounts: ConnectorAccountRepository,
    private readonly registry: CrmConnectorRegistry,
    private readonly resolver: ResolveOwnerService,
    private readonly channelAccesses: ChannelAccessRepository,
  ) {}

  async execute(input: DryRunDealInput): Promise<ConnectorHealth> {
    const account = await this.accounts.findById(input.connectorAccountId)
    if (!account || account.workspaceId !== input.workspaceId) {
      throw new ConnectorAccountNotFoundException(input.connectorAccountId)
    }

    const checks: ConnectorHealthCheck[] = []
    const dealFetch = await safeFetchLead(this.registry, account, input.externalDealId)
    checks.push(dealFetch.check)
    if (!dealFetch.lead) return reportFromChecks(checks)

    const ownerExternalCheck = checkOwnerExternal(dealFetch.lead)
    checks.push(ownerExternalCheck)

    if (dealFetch.lead.ownerExternalId) {
      const ownerCheck = await this.checkOwnerResolved(
        input.workspaceId,
        account,
        dealFetch.lead.ownerExternalId,
      )
      checks.push(ownerCheck.check)

      if (ownerCheck.userId) {
        const channelCheck = await this.checkPrimaryChannel(ownerCheck.userId)
        checks.push(channelCheck)
      }
    }

    checks.push(checkPhone(dealFetch.lead.phone))

    return reportFromChecks(checks)
  }

  private async checkOwnerResolved(
    workspaceId: string,
    account: { id: string; connectorId: string; credentials: unknown },
    ownerExternalId: string,
  ): Promise<{ check: ConnectorHealthCheck; userId: string | null }> {
    const resolved = await this.resolver.resolve({
      workspaceId,
      connectorAccountId: account.id,
      connectorId: account.connectorId,
      credentials: account.credentials,
      ownerExternalId,
    })
    if ('userId' in resolved && typeof resolved.userId === 'string') {
      return {
        check: {
          id: 'ownerResolved',
          label: 'Owner resolved',
          status: ConnectorHealthCheckStatus.Ok,
        },
        userId: resolved.userId,
      }
    }
    return {
      check: {
        id: 'ownerResolved',
        label: 'Owner resolved',
        status: ConnectorHealthCheckStatus.Fail,
        detail: resolved.errorReason,
      },
      userId: null,
    }
  }

  private async checkPrimaryChannel(userId: string): Promise<ConnectorHealthCheck> {
    for (const pluginId of META_PLUGIN_IDS) {
      const primary = await this.channelAccesses.findPrimaryAccount(userId, pluginId)
      if (primary) {
        return {
          id: 'primaryChannel',
          label: 'Primary channel',
          status: ConnectorHealthCheckStatus.Ok,
        }
      }
    }
    return {
      id: 'primaryChannel',
      label: 'Primary channel',
      status: ConnectorHealthCheckStatus.Fail,
      detail: 'No primary Meta WhatsApp channel for this owner.',
    }
  }
}

async function safeFetchLead(
  registry: CrmConnectorRegistry,
  account: { connectorId: string; credentials: unknown },
  externalId: string,
): Promise<{
  check: ConnectorHealthCheck
  lead: { ownerExternalId: string | null; phone?: string } | null
}> {
  try {
    const lead = await registry.fetchLead(account.connectorId, externalId, account.credentials)
    return {
      check: {
        id: 'dealFetch',
        label: 'Fetch deal',
        status: ConnectorHealthCheckStatus.Ok,
      },
      lead,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown'
    return {
      check: {
        id: 'dealFetch',
        label: 'Fetch deal',
        status: ConnectorHealthCheckStatus.Fail,
        detail: message,
      },
      lead: null,
    }
  }
}

function checkOwnerExternal(lead: { ownerExternalId: string | null }): ConnectorHealthCheck {
  if (lead.ownerExternalId) {
    return { id: 'ownerExternal', label: 'Owner on deal', status: ConnectorHealthCheckStatus.Ok }
  }
  return {
    id: 'ownerExternal',
    label: 'Owner on deal',
    status: ConnectorHealthCheckStatus.Fail,
    detail: 'The deal has no owner in Pipedrive.',
  }
}

function checkPhone(phone: string | undefined): ConnectorHealthCheck {
  if (phone && phone.length > 0) {
    return { id: 'phone', label: 'Lead phone', status: ConnectorHealthCheckStatus.Ok }
  }
  return {
    id: 'phone',
    label: 'Lead phone',
    status: ConnectorHealthCheckStatus.Fail,
    detail: 'The lead has no phone number set.',
  }
}

function reportFromChecks(checks: ConnectorHealthCheck[]): ConnectorHealth {
  const anyFail = checks.some((check) => check.status === ConnectorHealthCheckStatus.Fail)
  return {
    overall: anyFail ? ConnectorHealthOverall.Degraded : ConnectorHealthOverall.Ready,
    checks,
  }
}
