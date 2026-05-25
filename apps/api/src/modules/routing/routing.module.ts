import { Module } from '@nestjs/common'

import { ChannelModule } from '../channel/channel.module'
import { CrmModule } from '../crm/crm.module'
import { WorkspaceModule } from '../workspace/workspace.module'
import { GetRoutingReadinessUseCase } from './core/use-cases/get-routing-readiness.use-case'
import { RoutingController } from './http/controllers/routing.controller'

@Module({
  imports: [WorkspaceModule, ChannelModule, CrmModule],
  controllers: [RoutingController],
  providers: [GetRoutingReadinessUseCase],
})
export class RoutingModule {}
