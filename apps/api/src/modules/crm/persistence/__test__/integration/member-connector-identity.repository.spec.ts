import { closeDb, db, truncateAll } from '@kizunu/api/__test__/integration/db'
import { connectorAccounts } from '@kizunu/api/db/schemas/connector-accounts'
import { memberConnectorIdentities } from '@kizunu/api/db/schemas/member-connector-identities'
import { memberships } from '@kizunu/api/db/schemas/memberships'
import { users } from '@kizunu/api/db/schemas/users'
import { workspaces } from '@kizunu/api/db/schemas/workspaces'
import { MemberConnectorIdentityRepository } from '@kizunu/api/modules/crm/persistence/member-connector-identity.repository'
import type { DbTransaction } from '@kizunu/api/modules/engine/persistence/transaction'
import type { DrizzleService } from '@kizunu/nestjs-shared/modules/persistence/services/drizzle.service'
import { eq } from 'drizzle-orm'
import { afterAll, beforeEach, describe, expect, it } from 'vite-plus/test'

const repository = new MemberConnectorIdentityRepository({ db } as unknown as DrizzleService)

interface Seed {
  workspaceId: string
  userId: string
  membershipId: string
  connectorAccountId: string
}

async function seedScenario(): Promise<Seed> {
  const [workspace] = await db
    .insert(workspaces)
    .values({ name: 'Acme', slug: `acme-${crypto.randomUUID()}` })
    .returning({ id: workspaces.id })
  const [user] = await db
    .insert(users)
    .values({ email: `bdr-${crypto.randomUUID()}@acme.com`, name: 'BDR' })
    .returning({ id: users.id })
  const [membership] = await db
    .insert(memberships)
    .values({ workspaceId: workspace!.id, userId: user!.id, role: 'member', status: 'active' })
    .returning({ id: memberships.id })
  const [account] = await db
    .insert(connectorAccounts)
    .values({
      workspaceId: workspace!.id,
      connectorId: 'pipedrive',
      name: 'Acme Pipedrive',
      credentials: { apiToken: 'tok', companyDomain: 'acme' },
    })
    .returning({ id: connectorAccounts.id })
  return {
    workspaceId: workspace!.id,
    userId: user!.id,
    membershipId: membership!.id,
    connectorAccountId: account!.id,
  }
}

describe('MemberConnectorIdentityRepository (integration)', () => {
  beforeEach(async () => {
    await truncateAll([
      'member_connector_identities',
      'connector_accounts',
      'memberships',
      'users',
      'workspaces',
    ])
  })

  afterAll(async () => {
    await closeDb()
  })

  describe('findByExternal', () => {
    it('returns the mapping with the user id joined through memberships', async () => {
      const seed = await seedScenario()

      await db.insert(memberConnectorIdentities).values({
        workspaceId: seed.workspaceId,
        membershipId: seed.membershipId,
        connectorAccountId: seed.connectorAccountId,
        externalId: '12345',
        createdBy: 'auto:email',
        sourceEmail: 'bdr@acme.com',
      })

      const found = await repository.findByExternal(seed.connectorAccountId, '12345')

      expect(found).toMatchObject({ membershipId: seed.membershipId, userId: seed.userId })
    })

    it('returns undefined when no mapping exists for the (account, externalId) pair', async () => {
      const seed = await seedScenario()

      const found = await repository.findByExternal(seed.connectorAccountId, 'unknown')

      expect(found).toBeUndefined()
    })
  })

  describe('listByConnectorAccount', () => {
    it('returns rows joined with user email and name', async () => {
      const seed = await seedScenario()
      await db.insert(memberConnectorIdentities).values({
        workspaceId: seed.workspaceId,
        membershipId: seed.membershipId,
        connectorAccountId: seed.connectorAccountId,
        externalId: '99',
        createdBy: 'admin:operator',
        sourceEmail: null,
      })

      const rows = await repository.listByConnectorAccount(
        seed.workspaceId,
        seed.connectorAccountId,
      )

      expect(rows).toHaveLength(1)
      expect(rows[0]).toMatchObject({
        membershipId: seed.membershipId,
        userId: seed.userId,
        userName: 'BDR',
        externalId: '99',
        createdBy: 'admin:operator',
        sourceEmail: null,
      })
    })
  })

  describe('listForUser', () => {
    it('returns the connector identities a member owns across their workspaces', async () => {
      const seed = await seedScenario()
      await db.insert(memberConnectorIdentities).values({
        workspaceId: seed.workspaceId,
        membershipId: seed.membershipId,
        connectorAccountId: seed.connectorAccountId,
        externalId: '42',
        createdBy: 'auto:email',
        sourceEmail: 'bdr@acme.com',
      })

      const rows = await repository.listForUser(seed.userId)

      expect(rows).toEqual([
        {
          connectorAccountId: seed.connectorAccountId,
          connectorId: 'pipedrive',
          externalId: '42',
        },
      ])
    })

    it('returns empty when the user owns no mappings', async () => {
      const seed = await seedScenario()

      const rows = await repository.listForUser(seed.userId)

      expect(rows).toEqual([])
    })
  })

  describe('tryInsert', () => {
    it('inserts a new mapping and returns created=true', async () => {
      const seed = await seedScenario()

      const result = await db.transaction(async (tx) => {
        return await repository.tryInsert(tx as unknown as DbTransaction, {
          workspaceId: seed.workspaceId,
          membershipId: seed.membershipId,
          connectorAccountId: seed.connectorAccountId,
          externalId: '777',
          createdBy: 'auto:email',
          sourceEmail: 'bdr@acme.com',
        })
      })

      expect(result.created).toBe(true)
      const existing = await repository.findByExternal(seed.connectorAccountId, '777')
      expect(existing?.id).toBe(result.id)
    })

    it('returns the existing row and created=false on conflict (race safety)', async () => {
      const seed = await seedScenario()
      const [existing] = await db
        .insert(memberConnectorIdentities)
        .values({
          workspaceId: seed.workspaceId,
          membershipId: seed.membershipId,
          connectorAccountId: seed.connectorAccountId,
          externalId: '777',
          createdBy: 'auto:email',
          sourceEmail: 'first@acme.com',
        })
        .returning({ id: memberConnectorIdentities.id })

      const result = await db.transaction(async (tx) => {
        return await repository.tryInsert(tx as unknown as DbTransaction, {
          workspaceId: seed.workspaceId,
          membershipId: seed.membershipId,
          connectorAccountId: seed.connectorAccountId,
          externalId: '777',
          createdBy: 'auto:email',
          sourceEmail: 'second@acme.com',
        })
      })

      expect(result).toEqual({ id: existing!.id, created: false })
    })
  })

  describe('insertStrict', () => {
    it('throws when (connectorAccountId, externalId) already exists (unique violation)', async () => {
      const seed = await seedScenario()
      await db.insert(memberConnectorIdentities).values({
        workspaceId: seed.workspaceId,
        membershipId: seed.membershipId,
        connectorAccountId: seed.connectorAccountId,
        externalId: '500',
        createdBy: 'admin:x',
        sourceEmail: null,
      })

      await expect(
        db.transaction(async (tx) => {
          await repository.insertStrict(tx as unknown as DbTransaction, {
            workspaceId: seed.workspaceId,
            membershipId: seed.membershipId,
            connectorAccountId: seed.connectorAccountId,
            externalId: '500',
            createdBy: 'admin:y',
            sourceEmail: null,
          })
        }),
      ).rejects.toThrow()
    })
  })

  describe('updateMembership', () => {
    it('repoints a mapping to a new member and returns its external metadata', async () => {
      const seed = await seedScenario()
      const [otherUser] = await db
        .insert(users)
        .values({ email: `other-${crypto.randomUUID()}@acme.com`, name: 'Other' })
        .returning({ id: users.id })
      const [otherMembership] = await db
        .insert(memberships)
        .values({
          workspaceId: seed.workspaceId,
          userId: otherUser!.id,
          role: 'member',
          status: 'active',
        })
        .returning({ id: memberships.id })
      const [identity] = await db
        .insert(memberConnectorIdentities)
        .values({
          workspaceId: seed.workspaceId,
          membershipId: seed.membershipId,
          connectorAccountId: seed.connectorAccountId,
          externalId: 'X',
          createdBy: 'admin:op',
          sourceEmail: null,
        })
        .returning({ id: memberConnectorIdentities.id })

      const result = await db.transaction(async (tx) => {
        return await repository.updateMembership(tx as unknown as DbTransaction, {
          id: identity!.id,
          workspaceId: seed.workspaceId,
          membershipId: otherMembership!.id,
        })
      })

      expect(result).toEqual({
        updated: true,
        externalId: 'X',
        connectorAccountId: seed.connectorAccountId,
      })
    })

    it('returns undefined when the id is not in the given workspace', async () => {
      const seed = await seedScenario()
      const otherSeed = await seedScenario()
      const [identity] = await db
        .insert(memberConnectorIdentities)
        .values({
          workspaceId: seed.workspaceId,
          membershipId: seed.membershipId,
          connectorAccountId: seed.connectorAccountId,
          externalId: 'X',
          createdBy: 'admin:op',
          sourceEmail: null,
        })
        .returning({ id: memberConnectorIdentities.id })

      const result = await db.transaction(async (tx) => {
        return await repository.updateMembership(tx as unknown as DbTransaction, {
          id: identity!.id,
          workspaceId: otherSeed.workspaceId,
          membershipId: otherSeed.membershipId,
        })
      })

      expect(result).toBeUndefined()
    })
  })

  describe('delete', () => {
    it('removes a mapping scoped to the given workspace', async () => {
      const seed = await seedScenario()
      const [identity] = await db
        .insert(memberConnectorIdentities)
        .values({
          workspaceId: seed.workspaceId,
          membershipId: seed.membershipId,
          connectorAccountId: seed.connectorAccountId,
          externalId: 'X',
          createdBy: 'admin:op',
          sourceEmail: null,
        })
        .returning({ id: memberConnectorIdentities.id })

      const result = await db.transaction(async (tx) => {
        return await repository.delete(tx as unknown as DbTransaction, {
          id: identity!.id,
          workspaceId: seed.workspaceId,
        })
      })

      expect(result.deleted).toBe(true)
      const remaining = await repository.findByExternal(seed.connectorAccountId, 'X')
      expect(remaining).toBeUndefined()
    })

    it('returns deleted=false when the row is not in the given workspace', async () => {
      const seed = await seedScenario()
      const otherSeed = await seedScenario()
      const [identity] = await db
        .insert(memberConnectorIdentities)
        .values({
          workspaceId: seed.workspaceId,
          membershipId: seed.membershipId,
          connectorAccountId: seed.connectorAccountId,
          externalId: 'X',
          createdBy: 'admin:op',
          sourceEmail: null,
        })
        .returning({ id: memberConnectorIdentities.id })

      const result = await db.transaction(async (tx) => {
        return await repository.delete(tx as unknown as DbTransaction, {
          id: identity!.id,
          workspaceId: otherSeed.workspaceId,
        })
      })

      expect(result.deleted).toBe(false)
    })
  })

  describe('FK cascade on membership delete', () => {
    it('removes the identity row when its membership is deleted', async () => {
      const seed = await seedScenario()
      await db.insert(memberConnectorIdentities).values({
        workspaceId: seed.workspaceId,
        membershipId: seed.membershipId,
        connectorAccountId: seed.connectorAccountId,
        externalId: 'cascade-test',
        createdBy: 'admin:op',
        sourceEmail: null,
      })

      await db.delete(memberships).where(eq(memberships.id, seed.membershipId))

      const remaining = await repository.findByExternal(seed.connectorAccountId, 'cascade-test')
      expect(remaining).toBeUndefined()
    })
  })
})
