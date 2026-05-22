import type { Config } from '@kizunu/api/api.config'
import { ChannelPluginRegistry } from '@kizunu/api/modules/channel/core/plugin/channel-plugin-registry'
import { ChannelAccountRepository } from '@kizunu/api/modules/channel/persistence/channel-account.repository'
import { ConfigService } from '@kizunu/config-module/config.service'
import { Public } from '@kizunu/nestjs-shared/lib/decorators/public.decorator'
import { Body, Controller, ForbiddenException, Get, HttpCode, Post, Query } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'

import { MarkReplyUseCase } from '../../core/use-cases/mark-reply.use-case'

const META_PLUGIN_ID = 'meta-whatsapp'
const PHONE_NUMBER_KEY = 'phoneNumberId'

/**
 * Single app-level Meta inbound webhook. `GET` answers the subscribe verification by
 * echoing `hub.challenge` when the verify token matches; `POST` parses messages via the
 * Meta plugin and routes each to its ChannelAccount by `phone_number_id`, marking the
 * matching running journey replied. `@Public` — Meta calls it unauthenticated.
 */
@Public()
@ApiTags('webhooks')
@Controller('webhooks/meta')
export class MetaWebhookController {
  constructor(
    private readonly registry: ChannelPluginRegistry,
    private readonly channelAccounts: ChannelAccountRepository,
    private readonly markReply: MarkReplyUseCase,
    private readonly config: ConfigService<Config>,
  ) {}

  @Get()
  @HttpCode(200)
  verify(
    @Query('hub.mode') mode: string | undefined,
    @Query('hub.verify_token') token: string | undefined,
    @Query('hub.challenge') challenge: string | undefined,
  ): string {
    if (mode === 'subscribe' && token === this.config.get('meta.verifyToken')) {
      return challenge ?? ''
    }
    throw new ForbiddenException()
  }

  @Post()
  @HttpCode(200)
  async receive(@Body() rawBody: unknown): Promise<{ received: number }> {
    const messages = await this.registry.get(META_PLUGIN_ID).parseInbound(rawBody, {})
    for (const message of messages) {
      const account = await this.channelAccounts.findByPluginAndCredential(
        META_PLUGIN_ID,
        PHONE_NUMBER_KEY,
        message.toExternalId,
      )
      if (account) {
        await this.markReply.execute({
          workspaceId: account.workspaceId,
          phone: message.fromExternalId,
        })
      }
    }
    return { received: messages.length }
  }
}
