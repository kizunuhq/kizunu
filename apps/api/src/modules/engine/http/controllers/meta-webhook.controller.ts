import { ChannelPluginRegistry } from '@kizunu/api/modules/channel/core/plugin/channel-plugin-registry'
import { ChannelAccountRepository } from '@kizunu/api/modules/channel/persistence/channel-account.repository'
import { Public } from '@kizunu/nestjs-shared/lib/decorators/public.decorator'
import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Query,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'

import { MarkReplyUseCase } from '../../core/use-cases/mark-reply.use-case'

const META_PLUGIN_ID = 'meta-whatsapp'
const HUB_SUBSCRIBE_MODE = 'subscribe'

/**
 * Per-channel Meta inbound webhook (feature 029). Every `ChannelAccount` owns
 * its callback URL (`/webhooks/meta/:channelAccountId`) and a server-generated
 * `verifyToken` inside `credentials`. `GET` answers Meta's subscribe-verify by
 * echoing `hub.challenge` when the supplied token matches the stored one (403
 * mismatch, 404 unknown id). `POST` parses inbound messages via the Meta plugin
 * and marks the matching running journey replied in the row's workspace.
 * `@Public` — Meta calls it unauthenticated.
 */
@Public()
@ApiTags('webhooks')
@Controller('webhooks/meta')
export class MetaWebhookController {
  constructor(
    private readonly registry: ChannelPluginRegistry,
    private readonly channelAccounts: ChannelAccountRepository,
    private readonly markReply: MarkReplyUseCase,
  ) {}

  @Get(':channelAccountId')
  @HttpCode(200)
  async verify(
    @Param('channelAccountId') channelAccountId: string,
    @Query('hub.mode') mode: string | undefined,
    @Query('hub.verify_token') token: string | undefined,
    @Query('hub.challenge') challenge: string | undefined,
  ): Promise<string> {
    const account = await this.channelAccounts.findWorkspaceAndCredentials(channelAccountId)
    if (!account) throw new NotFoundException()
    const stored = readVerifyToken(account.credentials)
    if (mode === HUB_SUBSCRIBE_MODE && token && stored && token === stored) {
      return challenge ?? ''
    }
    throw new ForbiddenException()
  }

  @Post(':channelAccountId')
  @HttpCode(200)
  async receive(
    @Param('channelAccountId') channelAccountId: string,
    @Body() rawBody: unknown,
  ): Promise<{ received: number }> {
    const account = await this.channelAccounts.findWorkspaceAndCredentials(channelAccountId)
    if (!account) throw new NotFoundException()
    const messages = await this.registry
      .get(META_PLUGIN_ID)
      .parseInbound(rawBody, account.credentials)
    for (const message of messages) {
      await this.markReply.execute({
        workspaceId: account.workspaceId,
        phone: message.fromExternalId,
      })
    }
    return { received: messages.length }
  }
}

function readVerifyToken(credentials: unknown): string | undefined {
  if (!credentials || typeof credentials !== 'object' || !('verifyToken' in credentials)) {
    return undefined
  }
  const value = credentials.verifyToken
  return typeof value === 'string' ? value : undefined
}
