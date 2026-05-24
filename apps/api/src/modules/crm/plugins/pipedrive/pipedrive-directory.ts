import type { DirectoryResult, DirectoryRow } from '@kizunu/api-contracts/shared'
import {
  assertProviderOk,
  toTruncatedResult,
} from '@kizunu/api/modules/_shared/directory/provider-http'
import { z } from 'zod'

import type { FetchFn } from './pipedrive-api'
import { pipedriveBaseUrl } from './pipedrive-api'
import type { PipedriveCredentials } from './pipedrive-credentials'

const PAGE_LIMIT = 500

const PIPEDRIVE_LIST_SCHEMA = z
  .object({
    success: z.boolean().optional(),
    data: z.array(z.record(z.string(), z.unknown())).nullable().optional(),
  })
  .catch({ data: [] })

export interface PipedriveDirectoryContext {
  fetchFn: FetchFn
  baseUrlOverride?: string
  accountId: string
  credentials: PipedriveCredentials
}

export async function listPipedriveUsers(ctx: PipedriveDirectoryContext): Promise<DirectoryResult> {
  const raws = await fetchList(ctx, 'users', `/users?start=0&limit=${PAGE_LIMIT}`)
  const rows = raws
    .map(toUserRow)
    .filter((row): row is DirectoryRow => row !== null)
    .sort(byLabel)
  return toTruncatedResult(rows)
}

export async function listPipedrivePipelines(
  ctx: PipedriveDirectoryContext,
): Promise<DirectoryResult> {
  const raws = await fetchList(ctx, 'pipelines', '/pipelines')
  return toTruncatedResult(toSortedByOrder(raws, toPipelineRow))
}

export async function listPipedriveStages(
  ctx: PipedriveDirectoryContext,
  pipelineId: string,
): Promise<DirectoryResult> {
  const raws = await fetchList(
    ctx,
    'stages',
    `/stages?pipeline_id=${encodeURIComponent(pipelineId)}`,
  )
  return toTruncatedResult(toSortedByOrder(raws, toStageRow))
}

export async function listPipedriveDealFields(
  ctx: PipedriveDirectoryContext,
): Promise<DirectoryResult> {
  const raws = await fetchList(ctx, 'fields', `/dealFields?start=0&limit=${PAGE_LIMIT}`)
  const rows = raws
    .map(toFieldRow)
    .filter((row): row is DirectoryRow => row !== null)
    .sort(byLabel)
  return toTruncatedResult(rows)
}

async function fetchList(
  ctx: PipedriveDirectoryContext,
  resource: string,
  path: string,
): Promise<Record<string, unknown>[]> {
  const base = ctx.baseUrlOverride ?? pipedriveBaseUrl(ctx.credentials.companyDomain)
  const separator = path.includes('?') ? '&' : '?'
  const url = `${base}${path}${separator}api_token=${ctx.credentials.apiToken}`
  const response = await ctx.fetchFn(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })
  assertProviderOk({ response, accountId: ctx.accountId, resource, scope: 'crm' })
  const raw: unknown = await response.json().catch(() => ({}))
  const parsed = PIPEDRIVE_LIST_SCHEMA.parse(raw)
  return parsed.data ?? []
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

function scalarToString(value: unknown): string | null {
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  return null
}

function byLabel(a: DirectoryRow, b: DirectoryRow): number {
  return a.label.localeCompare(b.label)
}
