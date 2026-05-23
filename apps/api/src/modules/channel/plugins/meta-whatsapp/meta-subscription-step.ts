/**
 * The two legs of Meta's webhook-subscription onboarding flow.
 * `AppSubscription` is `POST /{appId}/subscriptions` with the App Access Token;
 * `WabaSubscription` is `POST /{wabaId}/subscribed_apps` with the customer's
 * business/system token. Surfaced as the `step` field on
 * `MetaSubscriptionFailedException` so the web form can show the operator which
 * leg Meta rejected.
 */
export const MetaSubscriptionStep = {
  AppSubscription: 'app-subscription',
  WabaSubscription: 'waba-subscription',
} as const

export type MetaSubscriptionStep = (typeof MetaSubscriptionStep)[keyof typeof MetaSubscriptionStep]
