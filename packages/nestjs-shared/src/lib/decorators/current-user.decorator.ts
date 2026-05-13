import { createParamDecorator, type ExecutionContext } from '@nestjs/common'

export interface AuthenticatedUser {
  id: string
  email: string
  activeWorkspaceId?: string
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser | undefined => {
    const request = ctx.switchToHttp().getRequest<{ user?: AuthenticatedUser }>()
    return request.user
  },
)
