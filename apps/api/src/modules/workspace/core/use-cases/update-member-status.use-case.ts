import { Injectable } from '@nestjs/common'
import { WorkspaceMemberRepository } from '../../persistence/workspace-member.repository'
import { MembershipNotFoundException } from '../errors/workspace.errors'

export interface UpdateMemberStatusInput {
  workspaceId: string
  membershipId: string
  status: 'active' | 'inactive'
}

export interface UpdateMemberStatusOutput {
  membershipId: string
  status: 'active' | 'inactive'
}

@Injectable()
export class UpdateMemberStatusUseCase {
  constructor(private readonly members: WorkspaceMemberRepository) {}

  async execute(input: UpdateMemberStatusInput): Promise<UpdateMemberStatusOutput> {
    const membership = await this.members.findById(input.membershipId)
    if (!membership) {
      throw new MembershipNotFoundException(input.membershipId)
    }

    await this.members.setStatus(input.membershipId, input.status)
    return { membershipId: input.membershipId, status: input.status }
  }
}
