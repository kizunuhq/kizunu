import type { DirectoryResult, DirectoryRow } from '@kizunu/api-contracts/shared'
import {
  ConnectorDirectoryFailedException,
  ConnectorRateLimitedException,
  ConnectorTokenExpiredException,
} from '@kizunu/api/modules/_shared/directory/directory.errors'
import { z } from 'zod'

import type { FetchFn } from './pipedrive-api'
import { pipedriveBaseUrl } from './pipedrive-api'
import type { PipedriveCredentials } from './pipedrive-credentials'

const TRUNCATION_LIMIT = 500
const PAGE_LIMIT = 500
const UNAUTHORIZED = 401
const TOO_MANY = 429

const PIPEDRIVE_LIST_SCHEMA = z
  .object({
    success: z.boolean().optional(),
    data: z.array(z.record(z.string(), z.unknown())).nullable().optional(),
  })
  .catch({ data: [] })

interface PipedriveDirectoryDeps {
  fetchFn: FetchFn
  baseUrlOverride?: string
  accountId: string
}

export class PipedriveDirectory {
  constructor(private readonly deps: PipedriveDirectoryDeps) {}

  async listUsers(credentials: PipedriveCredentials): Promise<DirectoryResult> {
    const rows = await this.fetchList(credentials, 'users', `/users?start=0&limit=${PAGE_LIMIT}`)
    return toResult(
      rows
        .map(toUserRow)
        .filter((row): row is DirectoryRow => row !== null)
        .sort(byLabel),
    )
  }

  async listPipelines(credentials: PipedriveCredentials): Promise<DirectoryResult> {
    const rows = await this.fetchList(credentials, 'pipelines', '/pipelines')
    return toResult(toSortedByOrder(rows, toPipelineRow))
  }

  async listStages(
    credentials: PipedriveCredentials,
    pipelineId: string,
  ): Promise<DirectoryResult> {
    const rows = await this.fetchList(
      credentials,
      'stages',
      `/stages?pipeline_id=${encodeURIComponent(pipelineId)}`,
    )
    return toResult(toSortedByOrder(rows, toStageRow))
  }

  async listDealFields(credentials: PipedriveCredentials): Promise<DirectoryResult> {
    const rows = await this.fetchList(
      credentials,
      'fields',
      `/dealFields?start=0&limit=${PAGE_LIMIT}`,
    )
    return toResult(
      rows
        .map(toFieldRow)
        .filter((row): row is DirectoryRow => row !== null)
        .sort(byLabel),
    )
  }

  private async fetchList(
    credentials: PipedriveCredentials,
    resource: string,
    path: string,
  ): Promise<Record<string, unknown>[]> {
    const base = this.deps.baseUrlOverride ?? pipedriveBaseUrl(credentials.companyDomain)
    const separator = path.includes('?') ? '&' : '?'
    const url = `${base}${path}${separator}api_token=${credentials.apiToken}`
    const response = await this.deps.fetchFn(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })
    if (response.status === UNAUTHORIZED) {
      throw new ConnectorTokenExpiredException({ accountId: this.deps.accountId, scope: 'crm' })
    }
    if (response.status === TOO_MANY) {
      throw new ConnectorRateLimitedException({
        accountId: this.deps.accountId,
        ...readRetryAfter(response.headers),
      })
    }
    if (!response.ok) {
      throw new ConnectorDirectoryFailedException({
        accountId: this.deps.accountId,
        resource,
        detail: `Pipedrive ${path} -> ${response.status}`,
      })
    }
    const raw: unknown = await response.json().catch(() => ({}))
    const parsed = PIPEDRIVE_LIST_SCHEMA.parse(raw)
    return parsed.data ?? []
  }
}

function readRetryAfter(headers: Headers): { retryAfterSeconds?: number } {
  const raw = headers.get('retry-after')
  if (!raw) return {}
  const seconds = Number.parseInt(raw, 10)
  return Number.isFinite(seconds) && seconds > 0 ? { retryAfterSeconds: seconds } : {}
}

function toResult(items: DirectoryRow[]): DirectoryResult {
  if (items.length > TRUNCATION_LIMIT) {
    return { items: items.slice(0, TRUNCATION_LIMIT), meta: { truncated: true } }
  }
  return { items, meta: { truncated: false } }
}

function toUserRow(raw: Record<string, unknown>): DirectoryRow | null {
  const id = scalarToString(raw['id'])
  if (!id) return null
  const name = typeof raw['name'] === 'string' ? raw['name'] : id
  const email = typeof raw['email'] === 'string' ? raw['email'] : undefined
  const active = raw['active_flag'] !== false
  return {
    value: id,
    label: email ? `${name} <${email}>` : name,
    ...(active ? {} : { sublabel: 'inactive', disabled: true }),
  }
}

function toPipelineRow(raw: Record<string, unknown>): DirectoryRow | null {
  const id = scalarToString(raw['id'])
  if (!id) return null
  const name = typeof raw['name'] === 'string' ? raw['name'] : id
  const active = raw['active'] !== false
  if (!active) return { value: id, label: name, sublabel: 'archived', disabled: true }
  return { value: id, label: name }
}

function toStageRow(raw: Record<string, unknown>): DirectoryRow | null {
  const id = scalarToString(raw['id'])
  if (!id) return null
  const name = typeof raw['name'] === 'string' ? raw['name'] : id
  return { value: id, label: name }
}

function toFieldRow(raw: Record<string, unknown>): DirectoryRow | null {
  const key = typeof raw['key'] === 'string' ? raw['key'] : null
  if (!key) return null
  const name = typeof raw['name'] === 'string' ? raw['name'] : key
  const fieldType = typeof raw['field_type'] === 'string' ? raw['field_type'] : undefined
  return {
    value: key,
    label: name,
    ...(fieldType ? { sublabel: fieldType } : {}),
  }
}

function scalarToString(value: unknown): string | null {
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  return null
}

function byLabel(a: DirectoryRow, b: DirectoryRow): number {
  return a.label.localeCompare(b.label)
}

function toSortedByOrder(
  raws: Record<string, unknown>[],
  mapper: (raw: Record<string, unknown>) => DirectoryRow | null,
): DirectoryRow[] {
  const annotated = raws
    .map((raw) => ({ row: mapper(raw), order: orderOf(raw) }))
    .filter((entry): entry is { row: DirectoryRow; order: number } => entry.row !== null)
  annotated.sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order
    return a.row.label.localeCompare(b.row.label)
  })
  return annotated.map((entry) => entry.row)
}

function orderOf(raw: Record<string, unknown>): number {
  const value = raw['order_nr']
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10)
    if (Number.isFinite(parsed)) return parsed
  }
  return Number.POSITIVE_INFINITY
}
