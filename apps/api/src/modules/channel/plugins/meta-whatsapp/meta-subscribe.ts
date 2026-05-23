import { randomBytes } from 'node:crypto'

import { z } from 'zod'

import { type FetchFn } from './meta-send'
import {
  MetaSubscriptionFailedException,
  type MetaSubscriptionStep,
} from './meta-subscription-failed.exception'

const VERIFY_TOKEN_BYTE_LENGTH = 32

const metaResponseSchema = z
  .object({
    success: z.boolean().optional(),
    error: z
      .object({
        message: z.string().optional(),
        error_data: z.object({ details: z.string().optional() }).optional(),
      })
      .optional(),
  })
  .catch({})

interface SubscribeAppInput {
  baseUrl: string
  fetchFn: FetchFn
  appId: string
  appSecret: string
  callbackUrl: string
  verifyToken: string
}

interface SubscribeWabaInput {
  baseUrl: string
  fetchFn: FetchFn
  wabaId: string
  systemToken: string
  callbackUrl: string
  verifyToken: string
}

interface SubscribeMetaChannelInput {
  baseUrl: string
  fetchFn: FetchFn
  appUrl: string
  channelAccountId: string
  appId: string
  appSecret: string
  wabaId: string
  systemToken: string
}

/**
 * App-level subscription: POST /{appId}/subscriptions with the App Access Token
 * (`{appId}|{appSecret}`). Idempotent on Meta's side — calling it twice with the
 * same callback URL and verify token returns success. See research bundle §D.4
 * for the canonical request shape.
 */
export async function subscribeAppToMeta(input: SubscribeAppInput): Promise<void> {
  const params = new URLSearchParams({
    object: 'whatsapp_business_account',
    fields: 'messages',
    callback_url: input.callbackUrl,
    verify_token: input.verifyToken,
    access_token: `${input.appId}|${input.appSecret}`,
  })
  const response = await input.fetchFn(`${input.baseUrl}/${input.appId}/subscriptions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })
  await raiseOnFailure('app-subscription', response)
}

/**
 * Per-WABA subscription: POST /{wabaId}/subscribed_apps with the customer's
 * business/system token. `override_callback_uri` redirects this WABA's webhooks
 * to the per-channel kizunu URL; `verify_token` is the per-channel secret the
 * controller will check on Meta's GET-verify. Graph API can return HTTP 200 with
 * `success: false` on half-failures — we treat that as a failure too.
 */
export async function subscribeWabaToMeta(input: SubscribeWabaInput): Promise<void> {
  const params = new URLSearchParams({
    override_callback_uri: input.callbackUrl,
    verify_token: input.verifyToken,
    subscribed_fields: 'messages',
    access_token: input.systemToken,
  })
  const response = await input.fetchFn(`${input.baseUrl}/${input.wabaId}/subscribed_apps`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })
  await raiseOnFailure('waba-subscription', response)
}

/**
 * Compose both subscription calls and surface a fresh per-channel verify token
 * on success. The orchestrating use-case stores the token on the
 * `ChannelAccount` row so the inbound webhook controller can verify Meta's
 * later GET-verify against it.
 */
export async function subscribeMetaChannel(
  input: SubscribeMetaChannelInput,
): Promise<{ verifyToken: string }> {
  const verifyToken = randomBytes(VERIFY_TOKEN_BYTE_LENGTH).toString('hex')
  const callbackUrl = buildCallbackUrl(input.appUrl, input.channelAccountId)
  const shared = { baseUrl: input.baseUrl, fetchFn: input.fetchFn, callbackUrl, verifyToken }

  await subscribeAppToMeta({
    ...shared,
    appId: input.appId,
    appSecret: input.appSecret,
  })
  await subscribeWabaToMeta({
    ...shared,
    wabaId: input.wabaId,
    systemToken: input.systemToken,
  })
  return { verifyToken }
}

function buildCallbackUrl(appUrl: string, channelAccountId: string): string {
  const trimmed = appUrl.endsWith('/') ? appUrl.slice(0, -1) : appUrl
  return `${trimmed}/webhooks/meta/${channelAccountId}`
}

async function raiseOnFailure(step: MetaSubscriptionStep, response: Response): Promise<void> {
  const body = await readBody(response)
  if (response.ok && body.success !== false) return
  throw new MetaSubscriptionFailedException(step, response.status, extractMetaError(body))
}

async function readBody(response: Response): Promise<z.infer<typeof metaResponseSchema>> {
  const raw: unknown = await response.json().catch(() => ({}))
  return metaResponseSchema.parse(raw)
}

function extractMetaError(body: z.infer<typeof metaResponseSchema>): string | undefined {
  return body.error?.message ?? body.error?.error_data?.details
}
