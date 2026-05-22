import { ApiError } from '@kizunu/api-client/client/api-error'
import { getApiErrorMessage } from '@kizunu/web/lib/get-api-error-message'
import { describe, expect, it } from 'vite-plus/test'

describe('getApiErrorMessage', () => {
  it('returns the message from an ApiError envelope', () => {
    const error = new ApiError(422, 'workspace.slug_taken', 'That workspace slug is taken.')

    expect(getApiErrorMessage(error)).toBe('That workspace slug is taken.')
  })

  it('returns the message from a plain Error', () => {
    expect(getApiErrorMessage(new Error('Network down'))).toBe('Network down')
  })

  it('returns the default fallback for a non-error value', () => {
    expect(getApiErrorMessage('boom')).toBe('Something went wrong.')
  })

  it('returns a custom fallback for a non-error value', () => {
    expect(getApiErrorMessage(undefined, 'Could not save cadence.')).toBe('Could not save cadence.')
  })
})
