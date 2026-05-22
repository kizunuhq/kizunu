import { memberships } from '@kizunu/api/db/schemas/memberships'
import { users } from '@kizunu/api/db/schemas/users'
import { workspaces } from '@kizunu/api/db/schemas/workspaces'
import { DrizzleService } from '@kizunu/nestjs-shared/modules/persistence/services/drizzle.service'
import { Injectable } from '@nestjs/common'

const SLUG_MAX_LENGTH = 50
const SLUG_SUFFIX_LENGTH = 8

export interface ProvisionUserInput {
  email: string
  name: string
  passwordHash: string | null
  emailVerifiedAt?: Date | null
}

export interface ProvisionedUser {
  user: { id: string; email: string; name: string }
  workspace: { id: string; name: string; slug: string }
}

function buildWorkspaceSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-)|(-$)/g, '')
    .slice(0, SLUG_MAX_LENGTH)
  return `${base || 'workspace'}-${Bun.randomUUIDv7().slice(-SLUG_SUFFIX_LENGTH)}`
}

/**
 * Creates a user with their own workspace and an admin membership in one
 * transaction. Shared by register and OAuth sign-up so the "new account ->
 * personal workspace" shape lives in one place.
 */
@Injectable()
export class UserProvisioningService {
  constructor(private readonly drizzle: DrizzleService) {}

  async provision(input: ProvisionUserInput): Promise<ProvisionedUser> {
    return await this.drizzle.db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({
          email: input.email,
          passwordHash: input.passwordHash,
          name: input.name,
          emailVerifiedAt: input.emailVerifiedAt ?? null,
        })
        .returning({ id: users.id, email: users.email, name: users.name })
      if (!user) throw new Error('Failed to create user')

      const [workspace] = await tx
        .insert(workspaces)
        .values({ name: `${input.name}'s Workspace`, slug: buildWorkspaceSlug(input.name) })
        .returning({ id: workspaces.id, name: workspaces.name, slug: workspaces.slug })
      if (!workspace) throw new Error('Failed to create workspace')

      await tx
        .insert(memberships)
        .values({ workspaceId: workspace.id, userId: user.id, role: 'admin', status: 'active' })

      return { user, workspace }
    })
  }
}
