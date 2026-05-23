import { ApplicationException } from '@kizunu/nestjs-shared/lib/exceptions/application.exception'

import type { MetaConnectStep } from './meta-connect-step'

/**
 * Raised when one of the Meta Coex OAuth exchanges fails: the initial
 * code-for-token swap during Embedded Signup, or the long-lived refresh
 * exchange driven by `OAuthRefreshService`. Carries which step failed and the
 * HTTP status Meta returned (mirroring `MetaSubscriptionFailedException`).
 */
export class MetaConnectFailedException extends ApplicationException {
  constructor(step: MetaConnectStep, metaStatus: number, metaError?: string) {
    super('channel.meta-connect-failed', 'Meta rejected the OAuth exchange.', 422, {
      step,
      metaStatus,
      metaError,
    })
  }
}
