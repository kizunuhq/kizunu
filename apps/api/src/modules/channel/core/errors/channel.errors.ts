import { ApplicationException } from '@kizunu/nestjs-shared/lib/exceptions/application.exception'

export class UnknownChannelPluginException extends ApplicationException {
  constructor(pluginId: string) {
    super('channel.plugin-unknown', 'No channel plugin is registered for this id.', 404, {
      pluginId,
    })
  }
}

export class DuplicateChannelPluginException extends ApplicationException {
  constructor(pluginId: string) {
    super('channel.plugin-duplicate', 'Two channel plugins registered with the same id.', 500, {
      pluginId,
    })
  }
}

export class InvalidChannelCredentialsException extends ApplicationException {
  constructor(pluginId: string) {
    super(
      'channel.invalid-credentials',
      'The credentials do not satisfy this channel plugin schema.',
      422,
      { pluginId },
    )
  }
}

export class ChannelAccountNotFoundException extends ApplicationException {
  constructor(channelAccountId: string) {
    super('channel.account-not-found', 'Channel account not found.', 404, {
      channelAccountId,
    })
  }
}

export class ChannelAccessNotFoundException extends ApplicationException {
  constructor(channelAccountId: string) {
    super('channel.access-not-found', 'You do not have access to this channel account.', 404, {
      channelAccountId,
    })
  }
}

export class UserNotInWorkspaceException extends ApplicationException {
  constructor(userId: string) {
    super('channel.user-not-in-workspace', 'That user is not a member of this workspace.', 422, {
      userId,
    })
  }
}
