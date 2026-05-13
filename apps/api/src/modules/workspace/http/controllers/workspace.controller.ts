import {
  AcceptInvitationRequestSchema,
  InviteMemberRequestSchema,
  UpdateMemberRequestSchema,
} from '@kizunu/api-contracts/workspace'
import { CurrentUser } from '@kizunu/nestjs-shared/lib/decorators/current-user.decorator'
import type { AuthenticatedUser } from '@kizunu/nestjs-shared/lib/decorators/current-user.decorator'
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common'
import { createZodDto } from 'nestjs-zod'
import { AcceptInvitationUseCase } from '../../core/use-cases/accept-invitation.use-case'
import { InviteMemberUseCase } from '../../core/use-cases/invite-member.use-case'
import { ListWorkspaceMembersUseCase } from '../../core/use-cases/list-workspace-members.use-case'
import { UpdateMemberStatusUseCase } from '../../core/use-cases/update-member-status.use-case'
import { WorkspaceAdminGuard } from '../guards/workspace-admin.guard'

class InviteMemberDto extends createZodDto(InviteMemberRequestSchema) {}
class AcceptInvitationDto extends createZodDto(AcceptInvitationRequestSchema) {}
class UpdateMemberDto extends createZodDto(UpdateMemberRequestSchema) {}

@Controller('workspaces')
export class WorkspaceController {
  constructor(
    private readonly inviteUseCase: InviteMemberUseCase,
    private readonly acceptUseCase: AcceptInvitationUseCase,
    private readonly listMembersUseCase: ListWorkspaceMembersUseCase,
    private readonly updateMemberUseCase: UpdateMemberStatusUseCase,
  ) {}

  @UseGuards(WorkspaceAdminGuard)
  @Post(':id/invitations')
  async invite(@Param('id') workspaceId: string, @Body() body: InviteMemberDto) {
    const result = await this.inviteUseCase.execute({
      workspaceId,
      email: body.email,
      expiresInDays: body.expiresInDays,
    })
    return {
      invitationToken: result.invitationToken,
      expiresAt: result.expiresAt.toISOString(),
    }
  }

  @Post('invitations/accept')
  @HttpCode(200)
  async accept(
    @Body() body: AcceptInvitationDto,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ) {
    if (!user) throw new UnauthorizedException()
    return await this.acceptUseCase.execute({
      token: body.token,
      currentUser: { id: user.id, email: user.email },
    })
  }

  @UseGuards(WorkspaceAdminGuard)
  @Get(':id/members')
  async listMembers(@Param('id') workspaceId: string) {
    const members = await this.listMembersUseCase.execute(workspaceId)
    return {
      members: members.map((m) => ({
        membershipId: m.membershipId,
        userId: m.userId,
        userEmail: m.userEmail,
        userName: m.userName,
        role: m.role,
        status: m.status,
        joinedAt: m.joinedAt.toISOString(),
      })),
    }
  }

  @UseGuards(WorkspaceAdminGuard)
  @Patch(':id/members/:membershipId')
  async updateMember(
    @Param('id') workspaceId: string,
    @Param('membershipId') membershipId: string,
    @Body() body: UpdateMemberDto,
  ) {
    return await this.updateMemberUseCase.execute({
      workspaceId,
      membershipId,
      status: body.status,
    })
  }
}
