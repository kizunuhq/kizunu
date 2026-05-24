import { ConnectorAccountNotFoundException } from '@kizunu/api/modules/crm/core/errors/crm.errors'
import {
  MemberConnectorIdentityConflictException,
  MembershipNotInWorkspaceException,
} from '@kizunu/api/modules/crm/core/errors/member-connector-identity.errors'
import { LeadOwnerBackfillService } from '@kizunu/api/modules/crm/core/services/lead-owner-backfill.service'
import { CreateMemberConnectorIdentityUseCase } from '@kizunu/api/modules/crm/core/use-cases/create-member-connector-identity.use-case'
import type { ConnectorAccountRepository } from '@kizunu/api/modules/crm/persistence/connector-account.repository'
import type { MemberConnectorIdentityRepository } from '@kizunu/api/modules/crm/persistence/member-connector-identity.repository'
import type { WorkspaceMemberRepository } from '@kizunu/api/modules/workspace/persistence/workspace-member.repository'
import type { DrizzleService } from '@kizunu/nestjs-shared/modules/persistence/services/drizzle.service'
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'

function createAccounts(found: boolean) {
  return {
    findByIdInWorkspace: async () => (found ? { id: 'account-1' } : undefined),
  } as unknown as ConnectorAccountRepository
}

function createMembers(opts: { inWorkspace: boolean; userId?: string } = { inWorkspace: true }) {
  return {
    belongsToWorkspace: async () => opts.inWorkspace,
    findById: async () => (opts.userId ? { userId: opts.userId } : undefined),
  } as unknown as WorkspaceMemberRepository
}

interface FakeIdentitiesRepo {
  findByExternal: ReturnType<typeof vi.fn>
  insertStrict: ReturnType<typeof vi.fn>
}

function createIdentities(conflict: { id: string } | undefined): FakeIdentitiesRepo {
  return {
    findByExternal: vi.fn().mockResolvedValue(conflict),
    insertStrict: vi.fn().mockResolvedValue({ id: 'new-id' }),
  }
}

function createDrizzle(): DrizzleService {
  return {
    db: {
      transaction: async <T>(callback: (tx: unknown) => Promise<T>) => callback({}),
    },
  } as unknown as DrizzleService
}

const baseInput = {
  workspaceId: 'workspace-1',
  connectorAccountId: 'account-1',
  membershipId: 'member-1',
  externalId: '12345',
  createdBy: 'admin:operator',
}

describe('CreateMemberConnectorIdentityUseCase.execute', () => {
  let identities: FakeIdentitiesRepo
  let backfill: { backfillFor: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    identities = createIdentities(undefined)
    backfill = { backfillFor: vi.fn().mockResolvedValue({ leadsUpdated: 0, journeysResumed: 0 }) }
  })

  it('throws ConnectorAccountNotFoundException when the account is not in the workspace', async () => {
    const useCase = new CreateMemberConnectorIdentityUseCase(
      createAccounts(false),
      createMembers(),
      identities as unknown as MemberConnectorIdentityRepository,
      backfill as unknown as LeadOwnerBackfillService,
      createDrizzle(),
    )

    await expect(useCase.execute(baseInput)).rejects.toBeInstanceOf(
      ConnectorAccountNotFoundException,
    )
  })

  it('throws MembershipNotInWorkspaceException when the member is not in the workspace', async () => {
    const useCase = new CreateMemberConnectorIdentityUseCase(
      createAccounts(true),
      createMembers({ inWorkspace: false }),
      identities as unknown as MemberConnectorIdentityRepository,
      backfill as unknown as LeadOwnerBackfillService,
      createDrizzle(),
    )

    await expect(useCase.execute(baseInput)).rejects.toBeInstanceOf(
      MembershipNotInWorkspaceException,
    )
  })

  it('throws MemberConnectorIdentityConflictException when externalId already taken on the account', async () => {
    identities = createIdentities({ id: 'existing' })
    const useCase = new CreateMemberConnectorIdentityUseCase(
      createAccounts(true),
      createMembers({ inWorkspace: true, userId: 'user-1' }),
      identities as unknown as MemberConnectorIdentityRepository,
      backfill as unknown as LeadOwnerBackfillService,
      createDrizzle(),
    )

    await expect(useCase.execute(baseInput)).rejects.toBeInstanceOf(
      MemberConnectorIdentityConflictException,
    )
    expect(identities.insertStrict).not.toHaveBeenCalled()
    expect(backfill.backfillFor).not.toHaveBeenCalled()
  })

  it('persists the mapping with createdBy and runs the backfill with the resolved userId', async () => {
    const useCase = new CreateMemberConnectorIdentityUseCase(
      createAccounts(true),
      createMembers({ inWorkspace: true, userId: 'user-1' }),
      identities as unknown as MemberConnectorIdentityRepository,
      backfill as unknown as LeadOwnerBackfillService,
      createDrizzle(),
    )

    const result = await useCase.execute(baseInput)

    expect(result).toEqual({ id: 'new-id' })
    expect(identities.insertStrict).toHaveBeenCalledOnce()
    const insertArgs = identities.insertStrict.mock.calls[0]![1] as {
      sourceEmail: string | null
      createdBy: string
    }
    expect(insertArgs.sourceEmail).toBeNull()
    expect(insertArgs.createdBy).toBe('admin:operator')
    expect(backfill.backfillFor).toHaveBeenCalledOnce()
    const backfillArgs = backfill.backfillFor.mock.calls[0]![1] as { userId: string }
    expect(backfillArgs.userId).toBe('user-1')
  })

  it('skips the backfill when the membership has no resolvable userId (defensive)', async () => {
    const useCase = new CreateMemberConnectorIdentityUseCase(
      createAccounts(true),
      createMembers({ inWorkspace: true }),
      identities as unknown as MemberConnectorIdentityRepository,
      backfill as unknown as LeadOwnerBackfillService,
      createDrizzle(),
    )

    await useCase.execute(baseInput)

    expect(backfill.backfillFor).not.toHaveBeenCalled()
  })
})
