import { WorkspaceAdminGuard } from '@kizunu/api/modules/workspace/http/guards/workspace-admin.guard'
import { Controller, Get, Param, UseGuards } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'

import { ListAuditEventsUseCase } from '../../core/use-cases/list-audit-events.use-case'

@ApiTags('audit-events')
@UseGuards(WorkspaceAdminGuard)
@Controller('workspaces')
export class AuditEventController {
  constructor(private readonly listUseCase: ListAuditEventsUseCase) {}

  @Get(':id/audit-events')
  async list(@Param('id') workspaceId: string) {
    const events = await this.listUseCase.execute(workspaceId)
    return {
      events: events.map((event) => ({
        id: event.id,
        journeyId: event.journeyId,
        kind: event.kind,
        payload: event.payload,
        createdAt: event.createdAt.toISOString(),
      })),
    }
  }
}
