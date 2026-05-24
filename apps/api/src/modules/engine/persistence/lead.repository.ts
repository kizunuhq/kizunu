import { leads } from '@kizunu/api/db/schemas/leads'
import { DrizzleService } from '@kizunu/nestjs-shared/modules/persistence/services/drizzle.service'
import { Injectable } from '@nestjs/common'
import { and, eq, isNull } from 'drizzle-orm'

import type { DbTransaction } from './transaction'

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

  /**
   * Mirrors a CRM lead; updates name/phone/owner-external/owner-user on re-entry,
   * keyed by (account, externalId). `ownerUserId` is null when ingestion couldn't
   * resolve the CRM owner to a workspace member (parks the journey downstream).
   */
  async upsert(input: {
    workspaceId: string
    connectorAccountId: string
    externalId: string
    ownerExternalId: string | null
    ownerUserId: string | null
    name: string
    phone: string | null
  }): Promise<{ id: string }> {
    const rows = await this.drizzle.db
      .insert(leads)
      .values(input)
      .onConflictDoUpdate({
        target: [leads.connectorAccountId, leads.externalId],
        set: {
          name: input.name,
          phone: input.phone,
          ownerExternalId: input.ownerExternalId,
          ownerUserId: input.ownerUserId,
        },
      })
      .returning({ id: leads.id })
    const lead = rows[0]
    if (!lead) throw new Error('Failed to upsert lead')
    return lead
  }

  /**
   * Sets `ownerUserId` on every lead matching `(connectorAccountId, ownerExternalId)`
   * whose owner is still null — used when a new member-connector identity mapping is
   * created and we need to retroactively claim the leads sitting in error_state. Returns
   * the affected lead ids so the caller can resume parked journeys for the same set.
   */
  async backfillOwnerUserId(
    tx: DbTransaction,
    input: { connectorAccountId: string; ownerExternalId: string; ownerUserId: string },
  ): Promise<{ leadIds: string[] }> {
    const rows = await tx
      .update(leads)
      .set({ ownerUserId: input.ownerUserId })
      .where(
        and(
          eq(leads.connectorAccountId, input.connectorAccountId),
          eq(leads.ownerExternalId, input.ownerExternalId),
          isNull(leads.ownerUserId),
        ),
      )
      .returning({ id: leads.id })
    return { leadIds: rows.map((r) => r.id) }
  }
}
