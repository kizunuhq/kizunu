/**
 * An activity to log against a CRM deal. `ownerExternalId` attributes the activity
 * to the deal owner so it lands on the right timeline.
 */
export interface CrmActivity {
  type: string
  subject: string
  note?: string
  ownerExternalId: string | null
}
