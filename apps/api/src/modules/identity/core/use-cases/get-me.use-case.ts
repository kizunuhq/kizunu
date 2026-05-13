import { Injectable } from '@nestjs/common'

import { MembershipRepository } from '../../persistence/membership.repository'
import { UserRepository } from '../../persistence/user.repository'
import { SessionExpiredException } from '../errors/identity.errors'

export interface GetMeOutput {
  user: {
    id: string
    email: string
    name: string
    emailVerifiedAt: Date | null
  }
  memberships: Array<{
    workspaceId: string
    workspaceName: string
    workspaceSlug: string
    role: 'admin' | 'member'
    status: 'active' | 'inactive'
  }>
  activeWorkspaceId: string | null
}

@Injectable()
export class GetMeUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly memberships: MembershipRepository,
  ) {}

  async execute(userId: string, activeWorkspaceId: string | null): Promise<GetMeOutput> {
    const user = await this.users.findById(userId)
    if (!user) throw new SessionExpiredException()

    const userMemberships = await this.memberships.listForUser(user.id)

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerifiedAt: user.emailVerifiedAt,
      },
      memberships: userMemberships,
      activeWorkspaceId,
    }
  }
}
