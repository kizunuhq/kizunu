import { describe, expect, it } from 'vite-plus/test'

import { ConnectorHealthSchema } from '../../connector-health.contract'

describe('ConnectorHealthSchema', () => {
  it('accepts a ready report with all checks ok', () => {
    const parsed = ConnectorHealthSchema.safeParse({
      overall: 'ready',
      checks: [{ id: 'token', label: 'API token', status: 'ok' }],
    })

    expect(parsed.success).toBe(true)
  })

  it('rejects an unknown overall value', () => {
    const parsed = ConnectorHealthSchema.safeParse({
      overall: 'mostly-ok',
      checks: [],
    })

    expect(parsed.success).toBe(false)
  })

  it('accepts optional per-check detail', () => {
    const parsed = ConnectorHealthSchema.safeParse({
      overall: 'degraded',
      checks: [
        { id: 'pipelines', label: 'Pipelines', status: 'fail', detail: 'GET /v1/pipelines -> 503' },
      ],
    })

    expect(parsed.success).toBe(true)
  })
})
