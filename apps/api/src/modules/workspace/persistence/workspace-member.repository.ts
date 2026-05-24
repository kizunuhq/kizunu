import { memberships } from '@kizunu/api/db/schemas/memberships'
import { users } from '@kizunu/api/db/schemas/users'
import { DrizzleService } from '@kizunu/nestjs-shared/modules/persistence/services/drizzle.service'
import { Injectable } from '@nestjs/common'
import { and, eq } from 'drizzle-orm'

export interface WorkspaceMemberRow {
  membershipId: string
  userId: string
  userEmail: string
  userName: string
  role: 'admin' | 'member'
  status: 'active' | 'inactive'
  joinedAt: Date
}

@Injectable()
export class WorkspaceMemberRepository {
  constructor(private readonly drizzle: DrizzleService) {}

  async listByWorkspace(workspaceId: string): Promise<WorkspaceMemberRow[]> {
    return await this.drizzle.db
      .select({
        membershipId: memberships.id,
        userId: users.id,
        userEmail: users.email,
        userName: users.name,
        role: memberships.role,
        status: memberships.status,
        joinedAt: memberships.createdAt,
      })
      .from(memberships)
      .innerJoin(users, eq(memberships.userId, users.id))
      .where(eq(memberships.workspaceId, workspaceId))
  }

  async findActiveAdmin(userId: string, workspaceId: string): Promise<boolean> {
    const rows = await this.drizzle.db
      .select({ id: memberships.id })
      .from(memberships)
      .where(
        and(
          eq(memberships.userId, userId),
          eq(memberships.workspaceId, workspaceId),
          eq(memberships.role, 'admin'),
          eq(memberships.status, 'active'),
        ),
      )
      .limit(1)
    return !!rows[0]
  }

  async belongsToWorkspace(membershipId: string, workspaceId: string): Promise<boolean> {
    const rows = await this.drizzle.db
      .select({ id: memberships.id })
      .from(memberships)
      .where(and(eq(memberships.id, membershipId), eq(memberships.workspaceId, workspaceId)))
      .limit(1)
    return !!rows[0]
  }

  async findById(membershipId: string): Promise<WorkspaceMemberRow | undefined> {
    const rows = await this.drizzle.db
      .select({
        membershipId: memberships.id,
        userId: users.id,
        userEmail: users.email,
        userName: users.name,
        role: memberships.role,
        status: memberships.status,
        joinedAt: memberships.createdAt,
      })
      .from(memberships)
      .innerJoin(users, eq(memberships.userId, users.id))
      .where(eq(memberships.id, membershipId))
      .limit(1)
    return rows[0]
  }

  async findExistingMembership(
    userId: string,
    workspaceId: string,
  ): Promise<{ id: string; status: 'active' | 'inactive' } | undefined> {
    const rows = await this.drizzle.db
      .select({ id: memberships.id, status: memberships.status })
      .from(memberships)
      .where(and(eq(memberships.userId, userId), eq(memberships.workspaceId, workspaceId)))
      .limit(1)
    return rows[0]
  }

  async create(input: {
    workspaceId: string
    userId: string
    role: 'admin' | 'member'
  }): Promise<{ id: string }> {
    const rows = await this.drizzle.db
      .insert(memberships)
      .values({
        workspaceId: input.workspaceId,
        userId: input.userId,
        role: input.role,
        status: 'active',
      })
      .returning({ id: memberships.id })
    const created = rows[0]
    if (!created) throw new Error('Failed to create membership')
    return created
  }

  async setStatus(membershipId: string, status: 'active' | 'inactive'): Promise<void> {
    await this.drizzle.db
      .update(memberships)
      .set({ status })
      .where(eq(memberships.id, membershipId))
  }

  async reactivate(membershipId: string): Promise<void> {
    await this.setStatus(membershipId, 'active')
  }
}
