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
  /** Comma-separated fields. Defaults to 'messages' for cloud_api; Coex passes
   * 'messages,smb_message_echoes,smb_app_state_sync' (feature 031). */
  subscribedFields?: string
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
  return await postMetaForm({
    fetchFn: input.fetchFn,
    url: `${input.baseUrl}/${input.appId}/subscriptions`,
    step: 'app-subscription',
    params: {
      object: 'whatsapp_business_account',
      fields: 'messages',
      callback_url: input.callbackUrl,
      verify_token: input.verifyToken,
      access_token: `${input.appId}|${input.appSecret}`,
    },
  })
}

/**
 * Per-WABA subscription: POST /{wabaId}/subscribed_apps with the customer's
 * business/system token. `override_callback_uri` redirects this WABA's webhooks
 * to the per-channel kizunu URL; `verify_token` is the per-channel secret the
 * controller will check on Meta's GET-verify. Graph API can return HTTP 200 with
 * `success: false` on half-failures — `postMetaForm` treats that as a failure.
 */
export async function subscribeWabaToMeta(input: SubscribeWabaInput): Promise<void> {
  return await postMetaForm({
    fetchFn: input.fetchFn,
    url: `${input.baseUrl}/${input.wabaId}/subscribed_apps`,
    step: 'waba-subscription',
    params: {
      override_callback_uri: input.callbackUrl,
      verify_token: input.verifyToken,
      subscribed_fields: input.subscribedFields ?? 'messages',
      access_token: input.systemToken,
    },
  })
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

async function postMetaForm(args: {
  fetchFn: FetchFn
  url: string
  step: MetaSubscriptionStep
  params: Record<string, string>
}): Promise<void> {
  const response = await args.fetchFn(args.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(args.params).toString(),
  })
  const body = await readBody(response)
  if (response.ok && body.success !== false) return
  throw new MetaSubscriptionFailedException(args.step, response.status, extractMetaError(body))
}

async function readBody(response: Response): Promise<z.infer<typeof metaResponseSchema>> {
  const raw: unknown = await response.json().catch(() => ({}))
  return metaResponseSchema.parse(raw)
}

function extractMetaError(body: z.infer<typeof metaResponseSchema>): string | undefined {
  return body.error?.message ?? body.error?.error_data?.details
}
