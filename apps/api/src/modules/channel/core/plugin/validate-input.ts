import type { ChannelCapability } from './channel-capability'

/**
 * State a plugin's `validate` hook reasons over to decide whether (and how) the
 * next touch may be sent. Kept minimal and channel-neutral: the Meta plugin uses
 * `lastInboundAt` + `now` for the 24h customer-service window and
 * `hasApprovedTemplate` for the HSM-vs-freeform call. Later slices may add fields
 * without changing the port's shape.
 */
export interface ValidateInput {
  now: Date
  capabilities: ChannelCapability[]
  hasApprovedTemplate: boolean
  lastInboundAt?: Date
}
