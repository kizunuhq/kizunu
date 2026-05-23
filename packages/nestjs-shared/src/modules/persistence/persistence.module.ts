import { ConfigService } from '@kizunu/config-module/config.service'
import { Global, Module } from '@nestjs/common'

import { DrizzleService } from './services/drizzle.service'
import { EncryptedCredentialsService } from './services/encrypted-credentials.service'

type PersistenceConfig = {
  database: { url: string }
  credentials: { encryptionKey: string }
}

@Global()
@Module({
  providers: [
    {
      provide: DrizzleService,
      useFactory: (config: ConfigService<PersistenceConfig>) =>
        new DrizzleService(config.get('database.url')),
      inject: [ConfigService],
    },
    {
      provide: EncryptedCredentialsService,
      useFactory: (config: ConfigService<PersistenceConfig>) =>
        new EncryptedCredentialsService(config.get('credentials.encryptionKey')),
      inject: [ConfigService],
    },
  ],
  exports: [DrizzleService, EncryptedCredentialsService],
})
export class PersistenceModule {}
