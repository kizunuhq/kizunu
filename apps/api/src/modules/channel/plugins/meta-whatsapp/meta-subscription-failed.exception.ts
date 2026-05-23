import { ApplicationException } from '@kizunu/nestjs-shared/lib/exceptions/application.exception'

import type { MetaSubscriptionStep } from './meta-subscription-step'

/**
 * Raised when Meta's webhook-subscription flow rejects one of the two onboarding
 * calls (feature 029). `step` identifies which leg failed (`app-subscription` for
 * `POST /{appId}/subscriptions`, `waba-subscription` for
 * `POST /{wabaId}/subscribed_apps`), `metaStatus` is the HTTP status Meta
 * returned, and `metaError` is the message Graph API surfaced when present.
 * The HTTP filter renders this as `422 channel.meta-subscription-failed` so the
 * web form can show the operator which step + which Meta error caused the
 * failure.
 */
export class MetaSubscriptionFailedException extends ApplicationException {
  constructor(step: MetaSubscriptionStep, metaStatus: number, metaError?: string) {
    super('channel.meta-subscription-failed', 'Meta rejected the webhook subscription.', 422, {
      step,
      metaStatus,
      metaError,
    })
  }
}
