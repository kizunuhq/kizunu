import { Injectable } from '@nestjs/common'

import {
  type MyChannel,
  ChannelAccessRepository,
} from '../../persistence/channel-access.repository'

@Injectable()
export class ListMyChannelsUseCase {
  constructor(private readonly access: ChannelAccessRepository) {}

  async execute(userId: string): Promise<MyChannel[]> {
    return await this.access.listByUser(userId)
  }
}
