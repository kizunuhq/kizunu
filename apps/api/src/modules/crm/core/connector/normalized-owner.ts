/**
 * A CRM user (deal owner) normalized to the fields owner-mapping needs.
 * `email` is nullable because Pipedrive does not require an email on its user
 * record; when null, auto-match cannot proceed and ingestion parks the
 * journey in `error_state` reason `owner_not_mapped`.
 */
export interface NormalizedOwner {
  externalId: string
  name: string
  email: string | null
}
