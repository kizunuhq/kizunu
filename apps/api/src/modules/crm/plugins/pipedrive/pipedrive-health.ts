import type {
  ConnectorHealth,
  ConnectorHealthCheck,
  PipedriveCredentials,
} from '@kizunu/api-contracts/crm'
import { ConnectorHealthCheckStatus, ConnectorHealthOverall } from '@kizunu/api-contracts/crm'
import { z } from 'zod'

import type { FetchFn } from './pipedrive-api'
import { pipedriveBaseUrl } from './pipedrive-api'

const HTTP_UNAUTHORIZED = 401
const HTTP_FORBIDDEN = 403

const usersMeSchema = z
  .object({
    data: z
      .object({ id: z.union([z.number(), z.string()]).optional(), email: z.string().optional() })
      .catch({}),
  })
  .catch({ data: {} })

const collectionSchema = z.object({ data: z.array(z.unknown()).nullish() }).catch({ data: [] })

export interface PipedriveHealthContext {
  fetchFn: FetchFn
  baseUrlOverride?: string
}

interface CallSpec {
  path: string
  label: string
}

interface CallResult {
  ok: boolean
  detail?: string
  tokenRejected: boolean
  body: unknown
}

const TOKEN_REJECTED_DETAIL = 'Pipedrive rejected the API token.'

async function runCall(
  ctx: PipedriveHealthContext,
  credentials: PipedriveCredentials,
  spec: CallSpec,
): Promise<CallResult> {
  const base = ctx.baseUrlOverride ?? pipedriveBaseUrl(credentials.companyDomain)
  const url = `${base}${spec.path}?api_token=${credentials.apiToken}`
  try {
    const response = await ctx.fetchFn(url, { method: 'GET' })
    if (response.status === HTTP_UNAUTHORIZED || response.status === HTTP_FORBIDDEN) {
      return { ok: false, detail: TOKEN_REJECTED_DETAIL, tokenRejected: true, body: null }
    }
    if (!response.ok) {
      return {
        ok: false,
        detail: `GET ${spec.path} -> ${response.status}`,
        tokenRejected: false,
        body: null,
      }
    }
    const body: unknown = await response.json().catch(() => null)
    return { ok: true, tokenRejected: false, body }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown'
    return {
      ok: false,
      detail: `Pipedrive call threw: ${message}`,
      tokenRejected: false,
      body: null,
    }
  }
}

function collectionLength(body: unknown): number {
  const parsed = collectionSchema.safeParse(body)
  if (!parsed.success) return 0
  return parsed.data.data?.length ?? 0
}

function userOk(body: unknown): { ok: boolean; detail?: string } {
  const parsed = usersMeSchema.safeParse(body)
  const data = parsed.data?.data ?? {}
  const id = data.id
  const email = data.email
  if (
    (typeof id === 'number' || typeof id === 'string') &&
    typeof email === 'string' &&
    email.length > 0
  ) {
    return { ok: true }
  }
  return { ok: false, detail: 'Pipedrive /users/me did not return id + email.' }
}

function checkWebhook(credentials: PipedriveCredentials): ConnectorHealthCheck {
  const token = typeof credentials.webhookToken === 'string' ? credentials.webhookToken : ''
  if (token.length > 0) {
    return { id: 'webhook', label: 'Webhook URL', status: ConnectorHealthCheckStatus.Ok }
  }
  return {
    id: 'webhook',
    label: 'Webhook URL',
    status: ConnectorHealthCheckStatus.Fail,
    detail: 'No webhook token on this connector account (created before feature 053).',
  }
}

/**
 * Pipedrive health check. Issues the four Pipedrive calls in parallel so the
 * endpoint wall-clock is bounded by the slowest call rather than their sum.
 * The token-rejected rule (any 401/403) overrides `overall` to `'unreachable'`
 * regardless of which other checks pass.
 */
export async function runPipedriveHealth(
  ctx: PipedriveHealthContext,
  credentials: PipedriveCredentials,
): Promise<ConnectorHealth> {
  const [usersMe, pipelines, stages, fields] = await Promise.all([
    runCall(ctx, credentials, { path: '/users/me', label: 'API token' }),
    runCall(ctx, credentials, { path: '/pipelines', label: 'Pipelines' }),
    runCall(ctx, credentials, { path: '/stages', label: 'Stages' }),
    runCall(ctx, credentials, { path: '/dealFields', label: 'Deal fields' }),
  ])

  const tokenRejected = [usersMe, pipelines, stages, fields].some((call) => call.tokenRejected)

  const tokenCheck: ConnectorHealthCheck = usersMe.ok
    ? { id: 'token', label: 'API token', status: ConnectorHealthCheckStatus.Ok }
    : {
        id: 'token',
        label: 'API token',
        status: ConnectorHealthCheckStatus.Fail,
        detail: usersMe.detail ?? 'Pipedrive call failed.',
      }

  const userResult = usersMe.ok ? userOk(usersMe.body) : { ok: false, detail: usersMe.detail }
  const userCheck: ConnectorHealthCheck = userResult.ok
    ? { id: 'user', label: 'User', status: ConnectorHealthCheckStatus.Ok }
    : {
        id: 'user',
        label: 'User',
        status: ConnectorHealthCheckStatus.Fail,
        detail: userResult.detail ?? 'User read failed.',
      }

  const checks: ConnectorHealthCheck[] = [
    tokenCheck,
    userCheck,
    buildCollectionCheck('pipelines', 'Pipelines', pipelines),
    buildCollectionCheck('stages', 'Stages', stages),
    buildCollectionCheck('fields', 'Deal fields', fields),
    checkWebhook(credentials),
  ]

  const anyFail = checks.some((check) => check.status === ConnectorHealthCheckStatus.Fail)
  const overall = tokenRejected
    ? ConnectorHealthOverall.Unreachable
    : anyFail
      ? ConnectorHealthOverall.Degraded
      : ConnectorHealthOverall.Ready

  return { overall, checks }
}

function buildCollectionCheck(id: string, label: string, result: CallResult): ConnectorHealthCheck {
  if (!result.ok) {
    return {
      id,
      label,
      status: ConnectorHealthCheckStatus.Fail,
      detail: result.detail ?? 'Pipedrive call failed.',
    }
  }
  const length = collectionLength(result.body)
  if (length < 1) {
    return {
      id,
      label,
      status: ConnectorHealthCheckStatus.Fail,
      detail: `Pipedrive returned zero ${label.toLowerCase()}.`,
    }
  }
  return { id, label, status: ConnectorHealthCheckStatus.Ok }
}
