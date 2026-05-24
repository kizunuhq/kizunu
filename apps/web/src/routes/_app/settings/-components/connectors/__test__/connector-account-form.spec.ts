import { connectorAccountFormSchema } from '@kizunu/web/routes/_app/settings/-components/connectors/connector-account-form'
import { describe, expect, it } from 'vite-plus/test'

describe('connectorAccountFormSchema', () => {
  it('accepts a valid pipedrive payload with a JSON-object credentials string', () => {
    const result = connectorAccountFormSchema.safeParse({
      connectorId: 'pipedrive',
      name: 'Main',
      credentialsRaw: '{"apiToken":"abc"}',
    })

    expect(result.success).toBe(true)
  })

  it('rejects non-object JSON in credentialsRaw', () => {
    const result = connectorAccountFormSchema.safeParse({
      connectorId: 'pipedrive',
      name: 'Main',
      credentialsRaw: '"a-string"',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      const credIssue = result.error.issues.find((issue) => issue.path[0] === 'credentialsRaw')
      expect(credIssue?.message).toBe('Credentials must be a valid JSON object.')
    }
  })

  it('rejects malformed JSON in credentialsRaw', () => {
    const result = connectorAccountFormSchema.safeParse({
      connectorId: 'pipedrive',
      name: 'Main',
      credentialsRaw: 'not json',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      const credIssue = result.error.issues.find((issue) => issue.path[0] === 'credentialsRaw')
      expect(credIssue?.message).toBe('Credentials must be a valid JSON object.')
    }
  })

  it('rejects an empty connectorId', () => {
    const result = connectorAccountFormSchema.safeParse({
      connectorId: '',
      name: 'Main',
      credentialsRaw: '{}',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === 'connectorId')).toBe(true)
    }
  })
})
