import { describe, expect, it } from 'vite-plus/test'

import {
  pipedriveCredentialsInputSchema,
  pipedriveCredentialsSchema,
} from '../../pipedrive-credentials.contract'

describe('pipedriveCredentialsInputSchema', () => {
  it('accepts an apiToken-only input and defaults activityType', () => {
    const result = pipedriveCredentialsInputSchema.parse({ apiToken: 'tok' })

    expect(result).toEqual({ apiToken: 'tok', activityType: 'task' })
  })

  it('rejects an empty apiToken', () => {
    const parsed = pipedriveCredentialsInputSchema.safeParse({ apiToken: '' })

    expect(parsed.success).toBe(false)
  })

  it('accepts an optional companyDomain when present', () => {
    const result = pipedriveCredentialsInputSchema.parse({
      apiToken: 'tok',
      companyDomain: 'acme',
    })

    expect(result.companyDomain).toBe('acme')
  })

  it('rejects an unknown key (strict)', () => {
    const parsed = pipedriveCredentialsInputSchema.safeParse({
      apiToken: 'tok',
      webhookToken: 'leaking',
    })

    expect(parsed.success).toBe(false)
  })

  it('keeps storage schema requiring companyDomain', () => {
    const parsed = pipedriveCredentialsSchema.safeParse({ apiToken: 'tok' })

    expect(parsed.success).toBe(false)
  })
})
