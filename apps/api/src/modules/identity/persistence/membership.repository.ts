import { DrizzleService } from '@kizunu/nestjs-shared/modules/persistence/services/drizzle.service'
import { Injectable } from '@nestjs/common'
import { and, eq } from 'drizzle-orm'

import { memberships } from '../../../db/schemas/memberships'
import { workspaces } from '../../../db/schemas/workspaces'

export interface MembershipWithWorkspace {
  workspaceId: string
  workspaceName: string
  workspaceSlug: string
  role: 'admin' | 'member'
  status: 'active' | 'inactive'
}

@Injectable()
export class MembershipRepository {
  constructor(private readonly drizzle: DrizzleService) {}

  async listForUser(userId: string): Promise<MembershipWithWorkspace[]> {
    const rows = await this.drizzle.db
      .select({
        workspaceId: workspaces.id,
        workspaceName: workspaces.name,
        workspaceSlug: workspaces.slug,
        role: memberships.role,
        status: memberships.status,
      })
      .from(memberships)
      .innerJoin(workspaces, eq(memberships.workspaceId, workspaces.id))
      .where(eq(memberships.userId, userId))
    return rows
  }

  async findActiveByUserAndWorkspace(
    userId: string,
    workspaceId: string,
  ): Promise<MembershipWithWorkspace | undefined> {
    const rows = await this.drizzle.db
      .select({
        workspaceId: workspaces.id,
        workspaceName: workspaces.name,
        workspaceSlug: workspaces.slug,
        role: memberships.role,
        status: memberships.status,
      })
      .from(memberships)
      .innerJoin(workspaces, eq(memberships.workspaceId, workspaces.id))
      .where(
        and(
          eq(memberships.userId, userId),
          eq(memberships.workspaceId, workspaceId),
          eq(memberships.status, 'active'),
        ),
      )
      .limit(1)
    return rows[0]
  }
}
