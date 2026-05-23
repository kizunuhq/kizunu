import type { Config } from '@kizunu/api/api.config'
import { ConfigService } from '@kizunu/config-module/config.service'
import { Module } from '@nestjs/common'

import { WorkspaceModule } from '../workspace/workspace.module'
import { CHANNEL_PLUGINS, ChannelPluginRegistry } from './core/plugin/channel-plugin-registry'
import { OAuthRefreshService } from './core/services/oauth-refresh.service'
import { ConnectMetaCoexUseCase } from './core/use-cases/connect-meta-coex.use-case'
import { CreateChannelAccountUseCase } from './core/use-cases/create-channel-account.use-case'
import { GrantChannelAccessUseCase } from './core/use-cases/grant-channel-access.use-case'
import { ListAvailablePluginsUseCase } from './core/use-cases/list-available-plugins.use-case'
import { ListMyChannelsUseCase } from './core/use-cases/list-my-channels.use-case'
import { ListWorkspaceChannelAccountsUseCase } from './core/use-cases/list-workspace-channel-accounts.use-case'
import { RevokeChannelAccessUseCase } from './core/use-cases/revoke-channel-access.use-case'
import { SetPrimaryChannelUseCase } from './core/use-cases/set-primary-channel.use-case'
import { ChannelAccountController } from './http/controllers/channel-account.controller'
import { MyChannelController } from './http/controllers/my-channel.controller'
import { ChannelAccessRepository } from './persistence/channel-access.repository'
import { ChannelAccountRepository } from './persistence/channel-account.repository'
import { MetaWhatsappPlugin } from './plugins/meta-whatsapp/meta-whatsapp.plugin'

@Module({
  imports: [WorkspaceModule],
  controllers: [ChannelAccountController, MyChannelController],
  providers: [
    {
      provide: CHANNEL_PLUGINS,
      useFactory: (config: ConfigService<Config>) => [
        new MetaWhatsappPlugin({
          config: {
            appId: config.get('meta.appId') ?? '',
            appSecret: config.get('meta.appSecret') ?? '',
          },
        }),
      ],
      inject: [ConfigService],
    },
    ChannelPluginRegistry,
    ChannelAccountRepository,
    ChannelAccessRepository,
    CreateChannelAccountUseCase,
    ConnectMetaCoexUseCase,
    ListWorkspaceChannelAccountsUseCase,
    GrantChannelAccessUseCase,
    RevokeChannelAccessUseCase,
    SetPrimaryChannelUseCase,
    ListMyChannelsUseCase,
    ListAvailablePluginsUseCase,
    OAuthRefreshService,
  ],
  exports: [ChannelPluginRegistry, ChannelAccessRepository, ChannelAccountRepository],
})
export class ChannelModule {}
