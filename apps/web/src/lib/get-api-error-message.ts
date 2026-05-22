import { ApiError } from '@kizunu/api-client/client/api-error'

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong.'): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return fallback
}
