import { WorkspaceAdminGuard } from '@kizunu/api/modules/workspace/http/guards/workspace-admin.guard'
import { Controller, Get, Param, UseGuards } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'

import { GetRoutingReadinessUseCase } from '../../core/use-cases/get-routing-readiness.use-case'

@UseGuards(WorkspaceAdminGuard)
@ApiTags('workspaces')
@Controller('workspaces')
export class RoutingController {
  constructor(private readonly readinessUseCase: GetRoutingReadinessUseCase) {}

  @Get(':id/routing-readiness')
  async routingReadiness(@Param('id') workspaceId: string) {
    return await this.readinessUseCase.execute(workspaceId)
  }
}
