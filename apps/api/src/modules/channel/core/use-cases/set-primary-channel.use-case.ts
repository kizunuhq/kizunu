import { Injectable } from '@nestjs/common'

import { ChannelAccessRepository } from '../../persistence/channel-access.repository'
import { ChannelAccessNotFoundException } from '../errors/channel.errors'

export interface SetPrimaryChannelInput {
  userId: string
  channelAccountId: string
}

@Injectable()
export class SetPrimaryChannelUseCase {
  constructor(private readonly access: ChannelAccessRepository) {}

  async execute(input: SetPrimaryChannelInput): Promise<void> {
    const found = await this.access.findForUser(input.channelAccountId, input.userId)
    if (!found) throw new ChannelAccessNotFoundException(input.channelAccountId)

    await this.access.makePrimary({
      userId: input.userId,
      accessId: found.accessId,
      pluginId: found.pluginId,
    })
  }
}
