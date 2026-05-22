import { leads } from '@kizunu/api/db/schemas/leads'
import { DrizzleService } from '@kizunu/nestjs-shared/modules/persistence/services/drizzle.service'
import { Injectable } from '@nestjs/common'
import { and, eq } from 'drizzle-orm'

@Injectable()
export class LeadRepository {
  constructor(private readonly drizzle: DrizzleService) {}

  /** Bulk-reassigns a workspace's leads from one owner to another (admin reassignment). */
  async reassign(workspaceId: string, fromUserId: string, toUserId: string): Promise<void> {
    await this.drizzle.db
      .update(leads)
      .set({ ownerUserId: toUserId })
      .where(and(eq(leads.workspaceId, workspaceId), eq(leads.ownerUserId, fromUserId)))
  }

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
