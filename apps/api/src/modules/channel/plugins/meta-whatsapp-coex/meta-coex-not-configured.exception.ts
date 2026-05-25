import { ApplicationException } from '@kizunu/nestjs-shared/lib/exceptions/application.exception'

/**
 * Raised when the Coex connect endpoint is hit but the kizunu deploy has not
 * set the required `META_APP_ID`, `META_APP_SECRET`, and `META_COEX_CONFIG_ID`
 * env vars. 422 because it is a configuration-state problem —
 * not a system failure, but a request kizunu cannot satisfy yet.
 */
export class MetaCoexNotConfiguredException extends ApplicationException {
  constructor() {
    super(
      'channel.meta-coex-not-configured',
      'Embedded Signup is not configured on this kizunu instance. Set META_APP_ID, META_APP_SECRET, and META_COEX_CONFIG_ID.',
      422,
    )
  }
}
