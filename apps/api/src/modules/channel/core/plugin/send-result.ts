/**
 * Outcome of a plugin send. `externalMessageId` is the provider's id for the
 * message, recorded on the TouchAttempt for later correlation.
 */
export interface SendResult {
  externalMessageId: string
  status: 'sent' | 'failed'
  error?: string
}
