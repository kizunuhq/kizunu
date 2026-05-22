import { ConfigModule } from '@kizunu/config-module/config.module'
import { ApplicationExceptionFilter } from '@kizunu/nestjs-shared/lib/filters/application-exception.filter'
import { PersistenceModule } from '@kizunu/nestjs-shared/modules/persistence/persistence.module'
import { Module } from '@nestjs/common'
import { APP_FILTER } from '@nestjs/core'

import { load } from './api.config'
import { CadenceModule } from './modules/cadence/cadence.module'
import { ChannelModule } from './modules/channel/channel.module'
import { CrmModule } from './modules/crm/crm.module'
import { IdentityModule } from './modules/identity/identity.module'
import { WorkspaceModule } from './modules/workspace/workspace.module'
import { HealthController } from './shared/http/health.controller'

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [load],
      isGlobal: true,
    }),
    PersistenceModule,
    IdentityModule,
    WorkspaceModule,
    ChannelModule,
    CrmModule,
    CadenceModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: ApplicationExceptionFilter,
    },
  ],
})
export class ApiModule {}
