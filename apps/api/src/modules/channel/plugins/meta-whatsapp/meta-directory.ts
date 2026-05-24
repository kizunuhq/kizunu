import type { DirectoryResult, DirectoryRow } from '@kizunu/api-contracts/shared'
import {
  assertProviderOk,
  toTruncatedResult,
} from '@kizunu/api/modules/_shared/directory/provider-http'
import { z } from 'zod'

import type { MetaCredentials } from './meta-credentials'
import { bearerFor, type FetchFn, META_GRAPH_API_BASE } from './meta-send'

const PAGE_LIMIT = 200
const PAGE_CAP = 500

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
    paging: z.object({ next: z.string().optional() }).optional(),
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
        }),
      )
      .optional(),
  })
  .catch({ data: [] })

export interface MetaDirectoryContext {
  fetchFn: FetchFn
  baseUrl?: string
  accountId: string
  credentials: MetaCredentials
}

export async function listMetaTemplates(ctx: MetaDirectoryContext): Promise<DirectoryResult> {
  const base = ctx.baseUrl ?? META_GRAPH_API_BASE
  const bearer = bearerFor(ctx.credentials)
  const collected: DirectoryRow[] = []
  let nextUrl: string | null =
    `${base}/${ctx.credentials.wabaId}/message_templates?status=APPROVED&limit=${PAGE_LIMIT}`

  while (nextUrl && collected.length < PAGE_CAP) {
    const response = await ctx.fetchFn(nextUrl, {
      method: 'GET',
      headers: { Authorization: `Bearer ${bearer}` },
    })
    assertProviderOk({
      response,
      accountId: ctx.accountId,
      resource: 'templates',
      scope: 'channel',
    })
    const raw: unknown = await response.json().catch(() => ({}))
    const parsed = TEMPLATE_LIST_SCHEMA.parse(raw)
    for (const tpl of parsed.data ?? []) collected.push(toTemplateRow(tpl))
    nextUrl = parsed.paging?.next ?? null
  }
  return toTruncatedResult(collected)
}

export async function listMetaPhoneNumbers(ctx: MetaDirectoryContext): Promise<DirectoryResult> {
  const base = ctx.baseUrl ?? META_GRAPH_API_BASE
  const bearer = bearerFor(ctx.credentials)
  const url = `${base}/${ctx.credentials.wabaId}/phone_numbers?limit=${PAGE_LIMIT}`
  const response = await ctx.fetchFn(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${bearer}` },
  })
  assertProviderOk({
    response,
    accountId: ctx.accountId,
    resource: 'phoneNumbers',
    scope: 'channel',
  })
  const raw: unknown = await response.json().catch(() => ({}))
  const parsed = PHONE_NUMBER_LIST_SCHEMA.parse(raw)
  const rows = (parsed.data ?? []).map(toPhoneNumberRow)
  rows.sort((a, b) => a.label.localeCompare(b.label))
  return toTruncatedResult(rows)
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
