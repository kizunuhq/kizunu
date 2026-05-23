import { z } from 'zod'

import { MetaConnectFailedException } from './meta-connect-failed.exception'
import { MetaConnectStep } from './meta-connect-step'
import { type FetchFn } from './meta-send'

const MS_PER_SECOND = 1000

const tokenResponseSchema = z
  .object({
    access_token: z.string().optional(),
    token_type: z.string().optional(),
    expires_in: z.number().optional(),
    error: z
      .object({
        message: z.string().optional(),
        error_data: z.object({ details: z.string().optional() }).optional(),
      })
      .optional(),
  })
  .catch({})

interface ExchangeCodeInput {
  baseUrl: string
  fetchFn: FetchFn
  appId: string
  appSecret: string
  code: string
}

interface ExchangeRefreshInput {
  baseUrl: string
  fetchFn: FetchFn
  appId: string
  appSecret: string
  currentToken: string
}

export interface ExchangedToken {
  accessToken: string
  accessTokenExpiresAt?: string
}

/**
 * Exchanges Meta's Embedded Signup `code` for a business token (research §D.3).
 * GET `/oauth/access_token?client_id&client_secret&code` — no `redirect_uri`.
 */
export async function exchangeCodeForToken(input: ExchangeCodeInput): Promise<ExchangedToken> {
  const params = new URLSearchParams({
    client_id: input.appId,
    client_secret: input.appSecret,
    code: input.code,
  })
  const response = await input.fetchFn(`${input.baseUrl}/oauth/access_token?${params.toString()}`, {
    method: 'GET',
  })
  return await readToken(response, MetaConnectStep.CodeExchange)
}

/**
 * Long-lived exchange used by `OAuthRefreshService` to roll a near-expiry
 * Coex business token. Meta's documented grant_type is `fb_exchange_token`.
 */
export async function exchangeForRefreshedToken(
  input: ExchangeRefreshInput,
): Promise<ExchangedToken> {
  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: input.appId,
    client_secret: input.appSecret,
    fb_exchange_token: input.currentToken,
  })
  const response = await input.fetchFn(`${input.baseUrl}/oauth/access_token?${params.toString()}`, {
    method: 'GET',
  })
  return await readToken(response, MetaConnectStep.RefreshExchange)
}

async function readToken(response: Response, step: MetaConnectStep): Promise<ExchangedToken> {
  const raw: unknown = await response.json().catch(() => ({}))
  const body = tokenResponseSchema.parse(raw)
  if (!response.ok || !body.access_token) {
    throw new MetaConnectFailedException(step, response.status, extractError(body))
  }
  return {
    accessToken: body.access_token,
    accessTokenExpiresAt:
      body.expires_in === undefined
        ? undefined
        : new Date(Date.now() + body.expires_in * MS_PER_SECOND).toISOString(),
  }
}

function extractError(body: z.infer<typeof tokenResponseSchema>): string | undefined {
  return body.error?.message ?? body.error?.error_data?.details
}
