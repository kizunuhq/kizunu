import { ConfigService } from '@kizunu/config-module/config.service'
import { Global, Module } from '@nestjs/common'
import { DrizzleService } from './services/drizzle.service'

type WithDatabaseUrl = { database: { url: string } }

@Global()
@Module({
  providers: [
    {
      provide: DrizzleService,
      useFactory: (config: ConfigService<WithDatabaseUrl>) =>
        new DrizzleService(config.get('database.url')),
      inject: [ConfigService],
    },
  ],
  exports: [DrizzleService],
})
export class PersistenceModule {}
