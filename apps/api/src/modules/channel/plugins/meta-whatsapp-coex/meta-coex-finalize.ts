import type { MetaCoexistenceCredentials } from '@kizunu/api-contracts/channel'
import {
  type FetchFn,
  META_GRAPH_API_BASE,
} from '@kizunu/api/modules/channel/plugins/meta-whatsapp/meta-send'
import { subscribeWabaToMeta } from '@kizunu/api/modules/channel/plugins/meta-whatsapp/meta-subscribe'

const COEX_SUBSCRIBED_FIELDS = 'messages,smb_message_echoes,smb_app_state_sync'
const VERIFY_TOKEN_BYTE_LENGTH = 32

export interface CoexConnectionInput {
  channelAccountId: string
  appUrl: string
  wabaId: string
  phoneNumberId: string
  accessToken: string
  refreshToken?: string
  accessTokenExpiresAt?: string
}

export async function finalizeMetaCoexConnection(
  input: CoexConnectionInput,
  options?: { baseUrl?: string; fetchFn?: FetchFn },
): Promise<MetaCoexistenceCredentials> {
  const baseUrl = options?.baseUrl ?? META_GRAPH_API_BASE
  const fetchFn = options?.fetchFn ?? globalThis.fetch
  const verifyToken = await randomVerifyToken()
  const callbackUrl = buildCallbackUrl(input.appUrl, input.channelAccountId)
  await subscribeWabaToMeta({
    baseUrl,
    fetchFn,
    wabaId: input.wabaId,
    systemToken: input.accessToken,
    callbackUrl,
    verifyToken,
    subscribedFields: COEX_SUBSCRIBED_FIELDS,
  })
  return {
    channelMode: 'coexistence',
    wabaId: input.wabaId,
    phoneNumberId: input.phoneNumberId,
    verifyToken,
    accessToken: input.accessToken,
    ...(input.refreshToken === undefined ? {} : { refreshToken: input.refreshToken }),
    ...(input.accessTokenExpiresAt === undefined
      ? {}
      : { accessTokenExpiresAt: input.accessTokenExpiresAt }),
  }
}

function buildCallbackUrl(appUrl: string, channelAccountId: string): string {
  const trimmed = appUrl.endsWith('/') ? appUrl.slice(0, -1) : appUrl
  return `${trimmed}/webhooks/meta/${channelAccountId}`
}

async function randomVerifyToken(): Promise<string> {
  const { randomBytes } = await import('node:crypto')
  return randomBytes(VERIFY_TOKEN_BYTE_LENGTH).toString('hex')
}
