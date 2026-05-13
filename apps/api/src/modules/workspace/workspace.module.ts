import { Module } from '@nestjs/common'

import { AcceptInvitationUseCase } from './core/use-cases/accept-invitation.use-case'
import { InviteMemberUseCase } from './core/use-cases/invite-member.use-case'
import { ListWorkspaceMembersUseCase } from './core/use-cases/list-workspace-members.use-case'
import { UpdateMemberStatusUseCase } from './core/use-cases/update-member-status.use-case'
import { WorkspaceController } from './http/controllers/workspace.controller'
import { WorkspaceAdminGuard } from './http/guards/workspace-admin.guard'
import { VerificationTokenRepository } from './persistence/verification-token.repository'
import { WorkspaceMemberRepository } from './persistence/workspace-member.repository'
import { WorkspaceRepository } from './persistence/workspace.repository'

@Module({
  controllers: [WorkspaceController],
  providers: [
    WorkspaceRepository,
    WorkspaceMemberRepository,
    VerificationTokenRepository,
    InviteMemberUseCase,
    AcceptInvitationUseCase,
    ListWorkspaceMembersUseCase,
    UpdateMemberStatusUseCase,
    WorkspaceAdminGuard,
  ],
})
export class WorkspaceModule {}
