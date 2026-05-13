import { Controller, Get } from '@nestjs/common'
import { Public } from '@kizunu/nestjs-shared/lib/decorators/public.decorator'

@Controller('health')
export class HealthController {
  @Public()
  @Get()
  check(): { status: 'ok' } {
    return { status: 'ok' }
  }
}
