import { ApiClientError } from './api-client'

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong.'): string {
  if (error instanceof ApiClientError) return error.message
  if (error instanceof Error) return error.message
  return fallback
}
