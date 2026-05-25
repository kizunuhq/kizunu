import type { MetaCredentials } from '@kizunu/api-contracts/channel'
import type { ConnectorHealth, ConnectorHealthCheck } from '@kizunu/api-contracts/crm'
import { ConnectorHealthCheckStatus, ConnectorHealthOverall } from '@kizunu/api-contracts/crm'

import { bearerFor, type FetchFn, META_GRAPH_API_BASE } from './meta-send'

const HTTP_UNAUTHORIZED = 401
const HTTP_FORBIDDEN = 403
const EXPIRY_BUFFER_MS = 5 * 60 * 1000

interface MetaHealthContext {
  fetchFn: FetchFn
  baseUrl?: string
}

interface MetaCallResult {
  ok: boolean
  tokenRejected: boolean
  detail?: string
}

async function runMetaCall(
  ctx: MetaHealthContext,
  bearer: string,
  path: string,
): Promise<MetaCallResult> {
  const base = ctx.baseUrl ?? META_GRAPH_API_BASE
  try {
    const response = await ctx.fetchFn(`${base}${path}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${bearer}` },
    })
    if (response.status === HTTP_UNAUTHORIZED || response.status === HTTP_FORBIDDEN) {
      return { ok: false, tokenRejected: true, detail: 'Meta rejected the access token.' }
    }
    if (!response.ok) {
      return { ok: false, tokenRejected: false, detail: `GET ${path} -> ${response.status}` }
    }
    return { ok: true, tokenRejected: false }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown'
    return { ok: false, tokenRejected: false, detail: `Meta call threw: ${message}` }
  }
}

function checkVerifyToken(credentials: MetaCredentials): ConnectorHealthCheck {
  const token = credentials.verifyToken
  if (typeof token === 'string' && token.length > 0) {
    return { id: 'verifyToken', label: 'Verify token', status: ConnectorHealthCheckStatus.Ok }
  }
  return {
    id: 'verifyToken',
    label: 'Verify token',
    status: ConnectorHealthCheckStatus.Fail,
    detail: 'No verify token on this channel account (created before feature 029).',
  }
}

function checkExpiry(credentials: MetaCredentials): ConnectorHealthCheck | null {
  if (credentials.channelMode !== 'coexistence') return null
  const expiresAt = credentials.accessTokenExpiresAt
  if (!expiresAt) return null
  const expiryMs = new Date(expiresAt).getTime()
  if (Number.isNaN(expiryMs)) {
    return {
      id: 'expiry',
      label: 'Token expiry',
      status: ConnectorHealthCheckStatus.Fail,
      detail: 'accessTokenExpiresAt is unparseable.',
    }
  }
  const remaining = expiryMs - Date.now()
  if (remaining <= EXPIRY_BUFFER_MS) {
    return {
      id: 'expiry',
      label: 'Token expiry',
      status: ConnectorHealthCheckStatus.Fail,
      detail: `Access token expires in ${Math.max(0, Math.round(remaining / 1000))}s.`,
    }
  }
  return { id: 'expiry', label: 'Token expiry', status: ConnectorHealthCheckStatus.Ok }
}

/**
 * Meta WhatsApp health check. Runs `/me` and `/{phoneNumberId}` against
 * Graph in parallel; a 401/403 anywhere collapses overall to `unreachable`.
 * The verify-token check is synchronous. For coexistence credentials we
 * also emit an `expiry` check when an `accessTokenExpiresAt` is set within
 * the 5-minute refresh buffer.
 */
export async function runMetaHealth(
  ctx: MetaHealthContext,
  credentials: MetaCredentials,
): Promise<ConnectorHealth> {
  const bearer = bearerFor(credentials)
  const [me, phone] = await Promise.all([
    runMetaCall(ctx, bearer, `/me`),
    runMetaCall(ctx, bearer, `/${credentials.phoneNumberId}`),
  ])

  const tokenRejected = me.tokenRejected || phone.tokenRejected

  const checks: ConnectorHealthCheck[] = [
    me.ok
      ? { id: 'token', label: 'Access token', status: ConnectorHealthCheckStatus.Ok }
      : {
          id: 'token',
          label: 'Access token',
          status: ConnectorHealthCheckStatus.Fail,
          detail: me.detail ?? 'Meta call failed.',
        },
    phone.ok
      ? { id: 'phoneNumber', label: 'Phone number', status: ConnectorHealthCheckStatus.Ok }
      : {
          id: 'phoneNumber',
          label: 'Phone number',
          status: ConnectorHealthCheckStatus.Fail,
          detail: phone.detail ?? 'Meta call failed.',
        },
    checkVerifyToken(credentials),
  ]
  const expiry = checkExpiry(credentials)
  if (expiry) checks.push(expiry)

  const anyFail = checks.some((check) => check.status === ConnectorHealthCheckStatus.Fail)
  const overall = tokenRejected
    ? ConnectorHealthOverall.Unreachable
    : anyFail
      ? ConnectorHealthOverall.Degraded
      : ConnectorHealthOverall.Ready

  return { overall, checks }
}
