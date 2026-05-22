import { CurrentUser } from '@kizunu/nestjs-shared/lib/decorators/current-user.decorator'
import type { AuthenticatedUser } from '@kizunu/nestjs-shared/lib/decorators/current-user.decorator'
import { Controller, Get, HttpCode, Param, Patch, UnauthorizedException } from '@nestjs/common'

import { ListAvailablePluginsUseCase } from '../../core/use-cases/list-available-plugins.use-case'
import { ListMyChannelsUseCase } from '../../core/use-cases/list-my-channels.use-case'
import { SetPrimaryChannelUseCase } from '../../core/use-cases/set-primary-channel.use-case'

@Controller()
export class MyChannelController {
  constructor(
    private readonly listMine: ListMyChannelsUseCase,
    private readonly setPrimary: SetPrimaryChannelUseCase,
    private readonly listPlugins: ListAvailablePluginsUseCase,
  ) {}

  @Get('channel-accounts/mine')
  async mine(@CurrentUser() user: AuthenticatedUser | undefined) {
    if (!user) throw new UnauthorizedException()
    const channels = await this.listMine.execute(user.id)
    return { channels }
  }

  @Patch('channel-accounts/:accountId/primary')
  @HttpCode(204)
  async primary(
    @Param('accountId') accountId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ): Promise<void> {
    if (!user) throw new UnauthorizedException()
    await this.setPrimary.execute({ userId: user.id, channelAccountId: accountId })
  }

  @Get('channel-plugins')
  plugins() {
    return { plugins: this.listPlugins.execute() }
  }
}
