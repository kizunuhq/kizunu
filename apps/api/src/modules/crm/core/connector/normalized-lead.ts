/**
 * A CRM lead/deal normalized to the fields the engine needs. `ownerExternalId`
 * mirrors the deal owner (mapped to a Kizunu user); `phone` is the channel
 * recipient when the connector can resolve it.
 */
export interface NormalizedLead {
  externalId: string
  ownerExternalId: string | null
  name: string
  phone?: string
  raw: unknown
}
