import type { Config } from '@kizunu/api/api.config'
import { memberships } from '@kizunu/api/db/schemas/memberships'
import { sessions } from '@kizunu/api/db/schemas/sessions'
import { users } from '@kizunu/api/db/schemas/users'
import { workspaces } from '@kizunu/api/db/schemas/workspaces'
import { generateOpaqueToken, hashOpaqueToken } from '@kizunu/api/shared/crypto/opaque-token.helper'
import { ConfigService } from '@kizunu/config-module/config.service'
import { DrizzleService } from '@kizunu/nestjs-shared/modules/persistence/services/drizzle.service'
import { Injectable } from '@nestjs/common'
import { eq } from 'drizzle-orm'

import { hashPassword } from '../crypto/password.helper'
import {
  EmailAlreadyTakenException,
  RegistrationDisabledException,
} from '../errors/identity.errors'

export interface RegisterUserInput {
  email: string
  password: string
  name: string
  userAgent?: string | null
  ipAddress?: string | null
}

export interface RegisterUserOutput {
  user: { id: string; email: string; name: string }
  workspace: { id: string; name: string; slug: string }
  sessionToken: string
  expiresAt: Date
}

function generateWorkspaceSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-)|(-$)/g, '')
    .slice(0, 50)
  const suffix = Bun.randomUUIDv7().slice(-8)
  return `${base || 'workspace'}-${suffix}`
}

@Injectable()
export class RegisterUserUseCase {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly config: ConfigService<Config>,
  ) {}

  async execute(input: RegisterUserInput): Promise<RegisterUserOutput> {
    if (this.config.get('auth.registrationDisabled')) {
      throw new RegistrationDisabledException()
    }

    const existing = await this.drizzle.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1)
    if (existing[0]) {
      throw new EmailAlreadyTakenException(input.email)
    }

    const passwordHash = await hashPassword(input.password)
    const ttlDays = this.config.get('session.ttlDays')
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000)
    const sessionToken = generateOpaqueToken()
    const tokenHash = hashOpaqueToken(sessionToken)

    const result = await this.drizzle.db.transaction(async (tx) => {
      const insertedUsers = await tx
        .insert(users)
        .values({
          email: input.email,
          passwordHash,
          name: input.name,
        })
        .returning({ id: users.id, email: users.email, name: users.name })
      const user = insertedUsers[0]
      if (!user) throw new Error('Failed to create user')

      const slug = generateWorkspaceSlug(input.name)
      const insertedWorkspaces = await tx
        .insert(workspaces)
        .values({
          name: `${input.name}'s Workspace`,
          slug,
        })
        .returning({
          id: workspaces.id,
          name: workspaces.name,
          slug: workspaces.slug,
        })
      const workspace = insertedWorkspaces[0]
      if (!workspace) throw new Error('Failed to create workspace')

      await tx.insert(memberships).values({
        workspaceId: workspace.id,
        userId: user.id,
        role: 'admin',
        status: 'active',
      })

      await tx.insert(sessions).values({
        userId: user.id,
        tokenHash,
        activeWorkspaceId: workspace.id,
        expiresAt,
        userAgent: input.userAgent ?? null,
        ipAddress: input.ipAddress ?? null,
      })

      return { user, workspace }
    })

    return {
      user: result.user,
      workspace: result.workspace,
      sessionToken,
      expiresAt,
    }
  }
}
