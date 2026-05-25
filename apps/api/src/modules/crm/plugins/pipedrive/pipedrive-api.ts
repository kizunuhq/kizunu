import type { PipedriveCredentials } from '@kizunu/api-contracts/crm'
import { z } from 'zod'

import type { CrmActivity } from '../../core/connector/crm-activity'
import type { NormalizedLead } from '../../core/connector/normalized-lead'
import type { NormalizedOwner } from '../../core/connector/normalized-owner'
import type { StageRef } from '../../core/connector/stage-ref'
import { CrmRequestFailedException } from '../../core/errors/crm.errors'

export type FetchFn = (input: string | URL | Request, init?: RequestInit) => Promise<Response>

export const pipedriveBaseUrl = (companyDomain: string): string =>
  `https://${companyDomain}.pipedrive.com/api/v1`

const pipedriveResponseSchema = z
  .object({ data: z.record(z.string(), z.unknown()).optional() })
  .catch({})

type HttpMethod = 'GET' | 'POST' | 'PUT'

function stringifyScalar(value: unknown): string | null {
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  return null
}

function ownerOf(value: unknown): string | null {
  if (value == null) return null
  if (typeof value === 'object' && 'value' in value) {
    return stringifyScalar((value as { value: unknown }).value)
  }
  return stringifyScalar(value)
}

/**
 * Thin Pipedrive REST client. `baseUrlOverride`/`fetchFn` are injectable so tests
 * assert request shape without network. Non-OK responses raise CrmRequestFailedException
 * so callers never mistake a failure for success.
 */
export class PipedriveApi {
  constructor(
    private readonly fetchFn: FetchFn,
    private readonly baseUrlOverride?: string,
  ) {}

  private async request(input: {
    credentials: PipedriveCredentials
    path: string
    method: HttpMethod
    body?: Record<string, unknown>
  }): Promise<{ data?: Record<string, unknown> }> {
    const base = this.baseUrlOverride ?? pipedriveBaseUrl(input.credentials.companyDomain)
    const separator = input.path.includes('?') ? '&' : '?'
    const url = `${base}${input.path}${separator}api_token=${input.credentials.apiToken}`
    const response = await this.fetchFn(url, {
      method: input.method,
      headers: { 'Content-Type': 'application/json' },
      body: input.body === undefined ? undefined : JSON.stringify(input.body),
    })
    if (!response.ok) {
      throw new CrmRequestFailedException(
        `Pipedrive ${input.method} ${input.path} -> ${response.status}`,
      )
    }
    const raw: unknown = await response.json().catch(() => ({}))
    return pipedriveResponseSchema.parse(raw)
  }

  async fetchLead(externalId: string, credentials: PipedriveCredentials): Promise<NormalizedLead> {
    const { data } = await this.request({
      credentials,
      path: `/deals/${externalId}`,
      method: 'GET',
    })
    return {
      externalId,
      ownerExternalId: ownerOf(data?.['user_id']),
      name: typeof data?.['title'] === 'string' ? data['title'] : '',
      phone: this.resolvePhone(data, credentials.phoneFieldKey),
      raw: data,
    }
  }

  async fetchOwner(
    externalId: string,
    credentials: PipedriveCredentials,
  ): Promise<NormalizedOwner | null> {
    const base = this.baseUrlOverride ?? pipedriveBaseUrl(credentials.companyDomain)
    const url = `${base}/users/${externalId}?api_token=${credentials.apiToken}`
    const response = await this.fetchFn(url, { method: 'GET' })
    if (response.status === 404) return null
    if (!response.ok) {
      throw new CrmRequestFailedException(
        `Pipedrive GET /users/${externalId} -> ${response.status}`,
      )
    }
    const raw: unknown = await response.json().catch(() => ({}))
    const parsed = pipedriveResponseSchema.parse(raw)
    const data = parsed.data
    if (!data) return null
    const email = typeof data['email'] === 'string' ? data['email'] : null
    const name = typeof data['name'] === 'string' ? data['name'] : ''
    return { externalId, name, email }
  }

  private resolvePhone(
    data: Record<string, unknown> | undefined,
    phoneFieldKey?: string,
  ): string | undefined {
    if (!data || !phoneFieldKey) return undefined
    const value = data[phoneFieldKey]
    return typeof value === 'string' ? value : undefined
  }

  async logActivity(
    externalId: string,
    activity: CrmActivity,
    credentials: PipedriveCredentials,
  ): Promise<{ externalActivityId: string }> {
    const { data } = await this.request({
      credentials,
      path: '/activities',
      method: 'POST',
      body: {
        deal_id: Number(externalId),
        type: activity.type,
        subject: activity.subject,
        note: activity.note,
        user_id: activity.ownerExternalId == null ? undefined : Number(activity.ownerExternalId),
      },
    })
    return { externalActivityId: stringifyScalar(data?.['id']) ?? '' }
  }

  async moveStage(
    externalId: string,
    stage: StageRef,
    credentials: PipedriveCredentials,
  ): Promise<void> {
    await this.request({
      credentials,
      path: `/deals/${externalId}`,
      method: 'PUT',
      body: { stage_id: Number(stage.stageId) },
    })
  }

  async markLost(
    externalId: string,
    reason: string,
    credentials: PipedriveCredentials,
  ): Promise<void> {
    await this.request({
      credentials,
      path: `/deals/${externalId}`,
      method: 'PUT',
      body: { status: 'lost', lost_reason: reason },
    })
  }

  async setField(
    externalId: string,
    field: string,
    value: unknown,
    credentials: PipedriveCredentials,
  ): Promise<void> {
    await this.request({
      credentials,
      path: `/deals/${externalId}`,
      method: 'PUT',
      body: { [field]: value },
    })
  }
}
