import { connectorAccounts } from '@kizunu/api/db/schemas/connector-accounts'
import { memberConnectorIdentities } from '@kizunu/api/db/schemas/member-connector-identities'
import { memberships } from '@kizunu/api/db/schemas/memberships'
import { users } from '@kizunu/api/db/schemas/users'
import type { DbTransaction } from '@kizunu/api/modules/engine/persistence/transaction'
import { DrizzleService } from '@kizunu/nestjs-shared/modules/persistence/services/drizzle.service'
import { Injectable } from '@nestjs/common'
import { and, eq } from 'drizzle-orm'

export interface MemberConnectorIdentityListRow {
  id: string
  membershipId: string
  userId: string
  userEmail: string
  userName: string
  externalId: string
  createdBy: string
  sourceEmail: string | null
  createdAt: Date
}

export interface MemberConnectorIdentitySelfRow {
  connectorAccountId: string
  connectorId: string
  externalId: string
}

export interface CreateMemberConnectorIdentityInput {
  workspaceId: string
  membershipId: string
  connectorAccountId: string
  externalId: string
  createdBy: string
  sourceEmail: string | null
}

@Injectable()
export class MemberConnectorIdentityRepository {
  constructor(private readonly drizzle: DrizzleService) {}

  async findByExternal(
    connectorAccountId: string,
    externalId: string,
    tx?: DbTransaction,
  ): Promise<{ id: string; membershipId: string; userId: string } | undefined> {
    const executor = tx ?? this.drizzle.db
    const rows = await executor
      .select({
        id: memberConnectorIdentities.id,
        membershipId: memberConnectorIdentities.membershipId,
        userId: memberships.userId,
      })
      .from(memberConnectorIdentities)
      .innerJoin(memberships, eq(memberConnectorIdentities.membershipId, memberships.id))
      .where(
        and(
          eq(memberConnectorIdentities.connectorAccountId, connectorAccountId),
          eq(memberConnectorIdentities.externalId, externalId),
        ),
      )
      .limit(1)
    return rows[0]
  }

  async listByConnectorAccount(
    workspaceId: string,
    connectorAccountId: string,
  ): Promise<MemberConnectorIdentityListRow[]> {
    return await this.drizzle.db
      .select({
        id: memberConnectorIdentities.id,
        membershipId: memberConnectorIdentities.membershipId,
        userId: memberships.userId,
        userEmail: users.email,
        userName: users.name,
        externalId: memberConnectorIdentities.externalId,
        createdBy: memberConnectorIdentities.createdBy,
        sourceEmail: memberConnectorIdentities.sourceEmail,
        createdAt: memberConnectorIdentities.createdAt,
      })
      .from(memberConnectorIdentities)
      .innerJoin(memberships, eq(memberConnectorIdentities.membershipId, memberships.id))
      .innerJoin(users, eq(memberships.userId, users.id))
      .where(
        and(
          eq(memberConnectorIdentities.workspaceId, workspaceId),
          eq(memberConnectorIdentities.connectorAccountId, connectorAccountId),
        ),
      )
  }

  async listForUser(userId: string): Promise<MemberConnectorIdentitySelfRow[]> {
    return await this.drizzle.db
      .select({
        connectorAccountId: memberConnectorIdentities.connectorAccountId,
        connectorId: connectorAccounts.connectorId,
        externalId: memberConnectorIdentities.externalId,
      })
      .from(memberConnectorIdentities)
      .innerJoin(memberships, eq(memberConnectorIdentities.membershipId, memberships.id))
      .innerJoin(
        connectorAccounts,
        eq(memberConnectorIdentities.connectorAccountId, connectorAccounts.id),
      )
      .where(eq(memberships.userId, userId))
  }

  async tryInsert(
    tx: DbTransaction,
    input: CreateMemberConnectorIdentityInput,
  ): Promise<{ id: string; created: boolean }> {
    const inserted = await tx
      .insert(memberConnectorIdentities)
      .values(input)
      .onConflictDoNothing()
      .returning({ id: memberConnectorIdentities.id })
    const newRow = inserted[0]
    if (newRow) return { id: newRow.id, created: true }
    const existing = await this.findByExternal(input.connectorAccountId, input.externalId, tx)
    if (!existing) throw new Error('tryInsert: insert skipped but no existing row found')
    return { id: existing.id, created: false }
  }

  async insertStrict(
    tx: DbTransaction,
    input: CreateMemberConnectorIdentityInput,
  ): Promise<{ id: string }> {
    const rows = await tx
      .insert(memberConnectorIdentities)
      .values(input)
      .returning({ id: memberConnectorIdentities.id })
    const row = rows[0]
    if (!row) throw new Error('insertStrict: insert returned no row')
    return row
  }

  async updateMembership(
    tx: DbTransaction,
    input: { id: string; workspaceId: string; membershipId: string },
  ): Promise<{ updated: boolean; externalId: string; connectorAccountId: string } | undefined> {
    const rows = await tx
      .update(memberConnectorIdentities)
      .set({ membershipId: input.membershipId })
      .where(
        and(
          eq(memberConnectorIdentities.id, input.id),
          eq(memberConnectorIdentities.workspaceId, input.workspaceId),
        ),
      )
      .returning({
        externalId: memberConnectorIdentities.externalId,
        connectorAccountId: memberConnectorIdentities.connectorAccountId,
      })
    const row = rows[0]
    if (!row) return undefined
    return { updated: true, externalId: row.externalId, connectorAccountId: row.connectorAccountId }
  }

  async delete(
    tx: DbTransaction,
    input: { id: string; workspaceId: string },
  ): Promise<{ deleted: boolean }> {
    const rows = await tx
      .delete(memberConnectorIdentities)
      .where(
        and(
          eq(memberConnectorIdentities.id, input.id),
          eq(memberConnectorIdentities.workspaceId, input.workspaceId),
        ),
      )
      .returning({ id: memberConnectorIdentities.id })
    return { deleted: !!rows[0] }
  }
}
