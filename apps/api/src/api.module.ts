import { ConfigModule } from '@kizunu/config-module/config.module'
import { ApplicationExceptionFilter } from '@kizunu/nestjs-shared/lib/filters/application-exception.filter'
import { PersistenceModule } from '@kizunu/nestjs-shared/modules/persistence/persistence.module'
import { Module } from '@nestjs/common'
import { APP_FILTER, APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'

import { load } from './api.config'
import { CadenceModule } from './modules/cadence/cadence.module'
import { ChannelModule } from './modules/channel/channel.module'
import { CrmModule } from './modules/crm/crm.module'
import { EngineModule } from './modules/engine/engine.module'
import { IdentityModule } from './modules/identity/identity.module'
import { WorkspaceModule } from './modules/workspace/workspace.module'
import { HealthController } from './shared/http/health.controller'

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [load],
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PersistenceModule,
    IdentityModule,
    WorkspaceModule,
    ChannelModule,
    CrmModule,
    CadenceModule,
    EngineModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: ApplicationExceptionFilter,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class ApiModule {}
