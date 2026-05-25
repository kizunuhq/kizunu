import type { MetaCredentials } from '@kizunu/api-contracts/channel'
import { z } from 'zod'

import type { SendPayload } from '../../core/plugin/send-payload'
import type { SendResult } from '../../core/plugin/send-result'

export const META_GRAPH_API_BASE = 'https://graph.facebook.com/v21.0'

export type FetchFn = (input: string | URL | Request, init?: RequestInit) => Promise<Response>

/**
 * Picks the bearer token to use for outbound + WABA-level Graph API calls.
 * cloud_api → the operator's System Token; coexistence → the OAuth business
 * token that `OAuthRefreshService` keeps fresh.
 */
export function bearerFor(credentials: MetaCredentials): string {
  return credentials.channelMode === 'coexistence'
    ? credentials.accessToken
    : credentials.systemToken
}

const metaSendResponseSchema = z
  .object({
    messages: z.array(z.object({ id: z.string() })).optional(),
    error: z.object({ message: z.string().optional() }).optional(),
  })
  .catch({})

function buildTemplate(template: NonNullable<SendPayload['template']>) {
  const parameters = template.variables
    ? Object.values(template.variables).map((text) => ({ type: 'text', text }))
    : undefined
  return {
    name: template.name,
    language: { code: template.language },
    ...(parameters ? { components: [{ type: 'body', parameters }] } : {}),
  }
}

function buildBody(payload: SendPayload): Record<string, unknown> {
  const base = { messaging_product: 'whatsapp', to: payload.to }
  if (payload.mode === 'template' && payload.template) {
    return { ...base, type: 'template', template: buildTemplate(payload.template) }
  }
  return { ...base, type: 'text', text: { body: payload.body ?? '' } }
}

async function toSendResult(response: Response): Promise<SendResult> {
  const raw: unknown = await response.json().catch(() => ({}))
  const data = metaSendResponseSchema.parse(raw)
  if (!response.ok) {
    return {
      externalMessageId: '',
      status: 'failed',
      error: data.error?.message ?? `HTTP ${response.status}`,
    }
  }
  return { externalMessageId: data.messages?.[0]?.id ?? '', status: 'sent' }
}

export async function sendMetaMessage(input: {
  payload: SendPayload
  credentials: MetaCredentials
  baseUrl: string
  fetchFn: FetchFn
}): Promise<SendResult> {
  const { payload, credentials, baseUrl, fetchFn } = input
  const response = await fetchFn(`${baseUrl}/${credentials.phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${bearerFor(credentials)}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildBody(payload)),
  })
  return await toSendResult(response)
}
