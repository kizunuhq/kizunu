import { createParamDecorator, type ExecutionContext } from '@nestjs/common'
import type { ActiveSession } from '../../core/models/authenticated-user'

export const CurrentSession = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ActiveSession | undefined => {
    const request = ctx.switchToHttp().getRequest<{ session?: ActiveSession }>()
    return request.session
  },
)
