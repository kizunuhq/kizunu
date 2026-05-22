import { leads } from '@kizunu/api/db/schemas/leads'
import { DrizzleService } from '@kizunu/nestjs-shared/modules/persistence/services/drizzle.service'
import { Injectable } from '@nestjs/common'

@Injectable()
export class LeadRepository {
  constructor(private readonly drizzle: DrizzleService) {}

  /** Mirrors a CRM lead; updates name/phone/owner on re-entry, keyed by (account, externalId). */
  async upsert(input: {
    workspaceId: string
    connectorAccountId: string
    externalId: string
    ownerExternalId: string | null
    name: string
    phone: string | null
  }): Promise<{ id: string }> {
    const rows = await this.drizzle.db
      .insert(leads)
      .values(input)
      .onConflictDoUpdate({
        target: [leads.connectorAccountId, leads.externalId],
        set: { name: input.name, phone: input.phone, ownerExternalId: input.ownerExternalId },
      })
      .returning({ id: leads.id })
    const lead = rows[0]
    if (!lead) throw new Error('Failed to upsert lead')
    return lead
  }
}
