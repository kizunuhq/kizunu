import { LeadJourneyErrorReason } from '@kizunu/api/modules/engine/core/domain/lead-journey-error-reason'
import { UserRepository } from '@kizunu/api/modules/identity/persistence/user.repository'
import { DrizzleService } from '@kizunu/nestjs-shared/modules/persistence/services/drizzle.service'
import { Injectable, Logger } from '@nestjs/common'

import { MemberConnectorIdentityRepository } from '../../persistence/member-connector-identity.repository'
import { CrmConnectorRegistry } from '../connector/crm-connector-registry'
import type { NormalizedOwner } from '../connector/normalized-owner'

export interface ResolveOwnerInput {
  workspaceId: string
  connectorAccountId: string
  connectorId: string
  credentials: unknown
  ownerExternalId: string
}

export type ResolveOwnerOutput =
  | { userId: string }
  | { userId: null; errorReason: LeadJourneyErrorReason }

const PARKED_NOT_MAPPED: ResolveOwnerOutput = {
  userId: null,
  errorReason: LeadJourneyErrorReason.OwnerNotMapped,
}

const PARKED_LOOKUP_FAILED: ResolveOwnerOutput = {
  userId: null,
  errorReason: LeadJourneyErrorReason.OwnerLookupFailed,
}

@Injectable()
export class ResolveOwnerService {
  private readonly logger = new Logger(ResolveOwnerService.name)

  constructor(
    private readonly identities: MemberConnectorIdentityRepository,
    private readonly connectors: CrmConnectorRegistry,
    private readonly users: UserRepository,
    private readonly drizzle: DrizzleService,
  ) {}

  async resolve(input: ResolveOwnerInput): Promise<ResolveOwnerOutput> {
    const existing = await this.identities.findByExternal(
      input.connectorAccountId,
      input.ownerExternalId,
    )
    if (existing) return { userId: existing.userId }

    const connector = this.connectors.get(input.connectorId)
    if (!connector.fetchOwner) return PARKED_NOT_MAPPED

    const owner = await this.safeFetchOwner(input)
    if (owner === 'error') return PARKED_LOOKUP_FAILED
    if (!owner?.email) return PARKED_NOT_MAPPED

    const match = await this.users.findVerifiedActiveByEmail(
      input.workspaceId,
      owner.email.toLowerCase(),
    )
    if (!match) return PARKED_NOT_MAPPED

    await this.autoCreate(input, match.membershipId, owner.email)
    return { userId: match.userId }
  }

  private async safeFetchOwner(
    input: ResolveOwnerInput,
  ): Promise<NormalizedOwner | null | 'error'> {
    try {
      return await this.connectors.fetchOwner(
        input.connectorId,
        input.ownerExternalId,
        input.credentials,
      )
    } catch (error) {
      this.logger.warn(
        `fetchOwner failed for connector=${input.connectorId} external=${input.ownerExternalId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      )
      return 'error'
    }
  }

  private async autoCreate(
    input: ResolveOwnerInput,
    membershipId: string,
    sourceEmail: string,
  ): Promise<void> {
    await this.drizzle.db.transaction(async (tx) => {
      await this.identities.tryInsert(tx, {
        workspaceId: input.workspaceId,
        membershipId,
        connectorAccountId: input.connectorAccountId,
        externalId: input.ownerExternalId,
        createdBy: 'auto:email',
        sourceEmail,
      })
    })
  }
}
