import { Injectable } from '@nestjs/common'

import {
  WorkspaceMemberRepository,
  type WorkspaceMemberRow,
} from '../../persistence/workspace-member.repository'

@Injectable()
export class ListWorkspaceMembersUseCase {
  constructor(private readonly members: WorkspaceMemberRepository) {}

  async execute(workspaceId: string): Promise<WorkspaceMemberRow[]> {
    return await this.members.listByWorkspace(workspaceId)
  }
}
