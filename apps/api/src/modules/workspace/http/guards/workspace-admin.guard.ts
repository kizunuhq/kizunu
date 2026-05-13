import type { AuthenticatedUser } from '@kizunu/nestjs-shared/lib/decorators/current-user.decorator'
import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import type { Request } from 'express'
import { WorkspaceMemberRepository } from '../../persistence/workspace-member.repository'
import { NotWorkspaceAdminException } from '../../core/errors/workspace.errors'

interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser
}

@Injectable()
export class WorkspaceAdminGuard implements CanActivate {
  constructor(private readonly members: WorkspaceMemberRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const user = request.user
    if (!user) throw new UnauthorizedException()

    const workspaceId = (request.params as Record<string, string | undefined>)?.id
    if (!workspaceId) throw new NotWorkspaceAdminException('')

    const isAdmin = await this.members.findActiveAdmin(user.id, workspaceId)
    if (!isAdmin) throw new NotWorkspaceAdminException(workspaceId)
    return true
  }
}
