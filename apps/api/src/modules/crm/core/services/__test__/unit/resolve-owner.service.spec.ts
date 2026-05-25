import type { CRMConnector } from '@kizunu/api/modules/crm/core/connector/crm-connector'
import { CrmConnectorRegistry } from '@kizunu/api/modules/crm/core/connector/crm-connector-registry'
import type { NormalizedOwner } from '@kizunu/api/modules/crm/core/connector/normalized-owner'
import { ResolveOwnerService } from '@kizunu/api/modules/crm/core/services/resolve-owner.service'
import type {
  CreateMemberConnectorIdentityInput,
  MemberConnectorIdentityRepository,
} from '@kizunu/api/modules/crm/persistence/member-connector-identity.repository'
import { LeadJourneyErrorReason } from '@kizunu/api/modules/engine/core/domain/lead-journey-error-reason'
import type { UserRepository } from '@kizunu/api/modules/identity/persistence/user.repository'
import type { DrizzleService } from '@kizunu/nestjs-shared/modules/persistence/services/drizzle.service'
import { describe, expect, it } from 'vite-plus/test'

interface FakeRow {
  membershipId: string
  userId: string
  externalId: string
  connectorAccountId: string
  sourceEmail: string | null
  createdBy: string
}

function createIdentitiesRepo(initial: FakeRow[] = []) {
  const rows: FakeRow[] = [...initial]
  return {
    rows,
    findByExternal: async (connectorAccountId: string, externalId: string) => {
      const row = rows.find(
        (r) => r.connectorAccountId === connectorAccountId && r.externalId === externalId,
      )
      if (!row) return undefined
      return { id: 'fake', membershipId: row.membershipId, userId: row.userId }
    },
    tryInsert: async (_tx: unknown, input: CreateMemberConnectorIdentityInput) => {
      const existing = rows.find(
        (r) =>
          r.connectorAccountId === input.connectorAccountId && r.externalId === input.externalId,
      )
      if (existing) return { id: 'existing', created: false }
      rows.push({
        membershipId: input.membershipId,
        userId: 'unused-by-tryInsert',
        externalId: input.externalId,
        connectorAccountId: input.connectorAccountId,
        sourceEmail: input.sourceEmail,
        createdBy: input.createdBy,
      })
      return { id: 'new', created: true }
    },
  } as unknown as MemberConnectorIdentityRepository & { rows: FakeRow[] }
}

function createUsersRepo(matches: Record<string, { userId: string; membershipId: string }> = {}) {
  return {
    findVerifiedActiveByEmail: async (_workspaceId: string, lowercaseEmail: string) => {
      return matches[lowercaseEmail]
    },
  } as unknown as UserRepository
}

function createRegistry(fetchOwner?: CRMConnector['fetchOwner']) {
  const connector = { manifest: { id: 'pipedrive' }, fetchOwner } as unknown as CRMConnector
  return {
    get: () => connector,
    fetchOwner: async (_id: string, externalId: string, credentials: unknown) =>
      fetchOwner ? ((await fetchOwner(externalId, credentials)) ?? null) : null,
  } as unknown as CrmConnectorRegistry
}

function createDrizzleStub(): DrizzleService {
  return {
    db: {
      transaction: async <T>(callback: (tx: unknown) => Promise<T>) => callback({}),
    },
  } as unknown as DrizzleService
}

const baseInput = {
  workspaceId: 'workspace-1',
  connectorAccountId: 'account-1',
  connectorId: 'pipedrive',
  credentials: { apiToken: 'tok' },
  ownerExternalId: '12345',
}

describe('ResolveOwnerService.resolve', () => {
  it('returns the userId when a mapping already exists', async () => {
    const identities = createIdentitiesRepo([
      {
        membershipId: 'member-1',
        userId: 'user-1',
        externalId: '12345',
        connectorAccountId: 'account-1',
        sourceEmail: null,
        createdBy: 'admin:op',
      },
    ])
    const service = new ResolveOwnerService(
      identities,
      createRegistry(),
      createUsersRepo(),
      createDrizzleStub(),
    )

    const result = await service.resolve(baseInput)

    expect(result).toEqual({ userId: 'user-1' })
  })

  it('parks owner_not_mapped when the connector does not implement fetchOwner', async () => {
    const service = new ResolveOwnerService(
      createIdentitiesRepo(),
      createRegistry(undefined),
      createUsersRepo(),
      createDrizzleStub(),
    )

    const result = await service.resolve(baseInput)

    expect(result).toEqual({
      userId: null,
      errorReason: LeadJourneyErrorReason.OwnerNotMapped,
    })
  })

  it('parks owner_not_mapped when fetchOwner returns null (Pipedrive 404)', async () => {
    const service = new ResolveOwnerService(
      createIdentitiesRepo(),
      createRegistry(async () => null),
      createUsersRepo(),
      createDrizzleStub(),
    )

    const result = await service.resolve(baseInput)

    expect(result).toEqual({
      userId: null,
      errorReason: LeadJourneyErrorReason.OwnerNotMapped,
    })
  })

  it('parks owner_not_mapped when fetchOwner returns an owner with no email', async () => {
    const owner: NormalizedOwner = { externalId: '12345', name: 'No Email', email: null }
    const service = new ResolveOwnerService(
      createIdentitiesRepo(),
      createRegistry(async () => owner),
      createUsersRepo(),
      createDrizzleStub(),
    )

    const result = await service.resolve(baseInput)

    expect(result).toEqual({
      userId: null,
      errorReason: LeadJourneyErrorReason.OwnerNotMapped,
    })
  })

  it('parks owner_not_mapped when the email does not match any verified-active member', async () => {
    const owner: NormalizedOwner = {
      externalId: '12345',
      name: 'Stranger',
      email: 'stranger@elsewhere.com',
    }
    const service = new ResolveOwnerService(
      createIdentitiesRepo(),
      createRegistry(async () => owner),
      createUsersRepo(),
      createDrizzleStub(),
    )

    const result = await service.resolve(baseInput)

    expect(result).toEqual({
      userId: null,
      errorReason: LeadJourneyErrorReason.OwnerNotMapped,
    })
  })

  it('matches case-insensitively when fetchOwner returns a mixed-case email', async () => {
    const owner: NormalizedOwner = {
      externalId: '12345',
      name: 'BDR',
      email: 'BDR@Acme.com',
    }
    const identities = createIdentitiesRepo()
    const service = new ResolveOwnerService(
      identities,
      createRegistry(async () => owner),
      createUsersRepo({
        'bdr@acme.com': { userId: 'user-1', membershipId: 'member-1' },
      }),
      createDrizzleStub(),
    )

    const result = await service.resolve(baseInput)

    expect(result).toEqual({ userId: 'user-1' })
    expect(identities.rows[0]).toMatchObject({
      membershipId: 'member-1',
      externalId: '12345',
      sourceEmail: 'BDR@Acme.com',
      createdBy: 'auto:email',
    })
  })

  it('parks owner_lookup_failed when fetchOwner throws', async () => {
    const service = new ResolveOwnerService(
      createIdentitiesRepo(),
      createRegistry(async () => {
        throw new Error('network down')
      }),
      createUsersRepo(),
      createDrizzleStub(),
    )

    const result = await service.resolve(baseInput)

    expect(result).toEqual({
      userId: null,
      errorReason: LeadJourneyErrorReason.OwnerLookupFailed,
    })
  })

  it('auto-creates the mapping with createdBy=auto:email and the matched user id', async () => {
    const owner: NormalizedOwner = {
      externalId: '12345',
      name: 'BDR',
      email: 'bdr@acme.com',
    }
    const identities = createIdentitiesRepo()
    const service = new ResolveOwnerService(
      identities,
      createRegistry(async () => owner),
      createUsersRepo({ 'bdr@acme.com': { userId: 'user-1', membershipId: 'member-1' } }),
      createDrizzleStub(),
    )

    const result = await service.resolve(baseInput)

    expect(result).toEqual({ userId: 'user-1' })
    expect(identities.rows).toHaveLength(1)
    expect(identities.rows[0]).toEqual({
      membershipId: 'member-1',
      userId: 'unused-by-tryInsert',
      externalId: '12345',
      connectorAccountId: 'account-1',
      sourceEmail: 'bdr@acme.com',
      createdBy: 'auto:email',
    })
  })
})
