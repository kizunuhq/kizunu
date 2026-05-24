import type { DirectoryResult, DirectoryRow } from '@kizunu/api-contracts/shared'
import {
  ConnectorDirectoryFailedException,
  ConnectorRateLimitedException,
  ConnectorTokenExpiredException,
} from '@kizunu/api/modules/_shared/directory/directory.errors'
import { z } from 'zod'

import type { MetaCredentials } from './meta-credentials'
import { bearerFor, type FetchFn, META_GRAPH_API_BASE } from './meta-send'

const TRUNCATION_LIMIT = 500
const PAGE_LIMIT = 200
const UNAUTHORIZED = 401
const TOO_MANY = 429

const TEMPLATE_LIST_SCHEMA = z
  .object({
    data: z
      .array(
        z.object({
          name: z.string(),
          language: z.string().optional(),
          status: z.string().optional(),
          category: z.string().optional(),
        }),
      )
      .optional(),
    paging: z
      .object({
        cursors: z.object({ after: z.string().optional() }).optional(),
        next: z.string().optional(),
      })
      .optional(),
  })
  .catch({ data: [] })

const PHONE_NUMBER_LIST_SCHEMA = z
  .object({
    data: z
      .array(
        z.object({
          id: z.string(),
          display_phone_number: z.string().optional(),
          verified_name: z.string().optional(),
          code_verification_status: z.string().optional(),
          quality_rating: z.string().optional(),
        }),
      )
      .optional(),
  })
  .catch({ data: [] })

interface MetaDirectoryDeps {
  fetchFn: FetchFn
  baseUrl?: string
  accountId: string
}

export class MetaDirectory {
  constructor(private readonly deps: MetaDirectoryDeps) {}

  async listTemplates(credentials: MetaCredentials): Promise<DirectoryResult> {
    const base = this.deps.baseUrl ?? META_GRAPH_API_BASE
    const bearer = bearerFor(credentials)
    const collected: DirectoryRow[] = []
    let nextUrl: string | null =
      `${base}/${credentials.wabaId}/message_templates?status=APPROVED&limit=${PAGE_LIMIT}`

    while (nextUrl && collected.length < TRUNCATION_LIMIT) {
      const response = await this.deps.fetchFn(nextUrl, {
        method: 'GET',
        headers: { Authorization: `Bearer ${bearer}` },
      })
      assertOk(response, 'templates', this.deps.accountId)
      const raw: unknown = await response.json().catch(() => ({}))
      const parsed = TEMPLATE_LIST_SCHEMA.parse(raw)
      for (const tpl of parsed.data ?? []) {
        collected.push(toTemplateRow(tpl))
      }
      nextUrl = parsed.paging?.next ?? null
    }
    return finalize(collected)
  }

  async listPhoneNumbers(credentials: MetaCredentials): Promise<DirectoryResult> {
    const base = this.deps.baseUrl ?? META_GRAPH_API_BASE
    const bearer = bearerFor(credentials)
    const url = `${base}/${credentials.wabaId}/phone_numbers?limit=${PAGE_LIMIT}`
    const response = await this.deps.fetchFn(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${bearer}` },
    })
    assertOk(response, 'phoneNumbers', this.deps.accountId)
    const raw: unknown = await response.json().catch(() => ({}))
    const parsed = PHONE_NUMBER_LIST_SCHEMA.parse(raw)
    const rows = (parsed.data ?? []).map(toPhoneNumberRow)
    rows.sort((a, b) => a.label.localeCompare(b.label))
    return finalize(rows)
  }
}

function assertOk(response: Response, resource: string, accountId: string): void {
  if (response.ok) return
  if (response.status === UNAUTHORIZED) {
    throw new ConnectorTokenExpiredException({ accountId, scope: 'channel' })
  }
  if (response.status === TOO_MANY) {
    throw new ConnectorRateLimitedException({ accountId, ...readRetryAfter(response.headers) })
  }
  throw new ConnectorDirectoryFailedException({
    accountId,
    resource,
    detail: `Meta /${resource} -> ${response.status}`,
  })
}

function readRetryAfter(headers: Headers): { retryAfterSeconds?: number } {
  const raw = headers.get('retry-after')
  if (!raw) return {}
  const seconds = Number.parseInt(raw, 10)
  return Number.isFinite(seconds) && seconds > 0 ? { retryAfterSeconds: seconds } : {}
}

function toTemplateRow(tpl: {
  name: string
  language?: string
  status?: string
  category?: string
}): DirectoryRow {
  const parts: string[] = []
  if (tpl.language) parts.push(tpl.language)
  if (tpl.category) parts.push(tpl.category.toLowerCase())
  return {
    value: tpl.name,
    label: tpl.name,
    ...(parts.length > 0 ? { sublabel: parts.join(' · ') } : {}),
  }
}

function toPhoneNumberRow(phone: {
  id: string
  display_phone_number?: string
  verified_name?: string
  code_verification_status?: string
}): DirectoryRow {
  const display = phone.display_phone_number ?? phone.id
  const verified = phone.verified_name ? ` (${phone.verified_name})` : ''
  const status = phone.code_verification_status?.toLowerCase()
  return {
    value: phone.id,
    label: `${display}${verified}`,
    ...(status ? { sublabel: status } : {}),
  }
}

function finalize(rows: DirectoryRow[]): DirectoryResult {
  if (rows.length > TRUNCATION_LIMIT) {
    return { items: rows.slice(0, TRUNCATION_LIMIT), meta: { truncated: true } }
  }
  return { items: rows, meta: { truncated: false } }
}
